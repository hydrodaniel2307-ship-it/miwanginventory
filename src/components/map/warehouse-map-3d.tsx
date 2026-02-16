"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HologramPanel } from "./hologram-panel";
import {
  FACE_MAX,
  DEFAULT_BAY_COUNT,
  DEFAULT_LEVEL_COUNT,
  buildLocationCode,
} from "@/lib/location-system";
import type { WarehouseLocation, WarehouseCell } from "@/lib/types/database";
import type { DecorItem } from "@/lib/map-layout";

const Warehouse3DScene = dynamic(
  () =>
    import("./warehouse-3d-scene").then((mod) => ({
      default: mod.Warehouse3DScene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex w-full items-center justify-center rounded-xl border border-cyan-500/20 bg-[#0a0f1e]" style={{ height: "clamp(280px, 55vh, 750px)" }}>
        <div className="flex items-center gap-2 text-cyan-400/60">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm font-mono">3D 엔진 로딩 중...</span>
        </div>
      </div>
    ),
  }
);

const EXPECTED_LOCATIONS = FACE_MAX * DEFAULT_BAY_COUNT * DEFAULT_LEVEL_COUNT;
const REQUEST_TIMEOUT_MS = 10000;

type LocationListResponse = {
  data: WarehouseLocation[];
  error?: string;
};

type SyncResponse = {
  created: number;
  reactivated: number;
  deactivated: number;
  error?: string;
};

type InventorySummaryItem = {
  location: string;
  totalQty: number;
  itemCount: number;
  hasLowStock: boolean;
};

type WarehouseMap3DProps = {
  editorMode: boolean;
  visualMode: "dark" | "bright";
  decorItems: DecorItem[];
  selectedDecorId: string | null;
  onSelectDecor: (id: string | null) => void;
  onPlaceDecor: (x: number, z: number) => void;
  highlightedCodes?: Set<string>;
  temperature?: number;
  selectedCell?: WarehouseCell | null;
  onSelectCell?: (cell: WarehouseCell | null) => void;
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchLocations(): Promise<WarehouseLocation[]> {
  let res: Response;
  try {
    res = await fetchWithTimeout("/api/admin/locations", { cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("창고맵 로딩 시간이 초과되었습니다. 잠시 후 다시 시도하세요.");
    }
    throw error;
  }
  const payload = await safeJson<LocationListResponse>(res);

  if (!res.ok) {
    throw new Error(payload?.error ?? "창고맵 데이터를 불러오지 못했습니다.");
  }

  return payload?.data ?? [];
}

async function triggerSync(): Promise<void> {
  let syncRes: Response;
  try {
    syncRes = await fetchWithTimeout("/api/admin/locations/sync", {
      method: "POST",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("위치 동기화 요청 시간이 초과되었습니다.");
    }
    throw error;
  }
  const syncPayload = await safeJson<SyncResponse>(syncRes);

  if (!syncRes.ok) {
    throw new Error(
      syncPayload?.error ?? "위치 생성/갱신 처리에 실패했습니다."
    );
  }
}

export function WarehouseMap3D({
  editorMode,
  visualMode,
  decorItems,
  selectedDecorId,
  onSelectDecor,
  onPlaceDecor,
  highlightedCodes,
  temperature,
  selectedCell,
  onSelectCell,
}: WarehouseMap3DProps) {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [dbCells, setDbCells] = useState<WarehouseCell[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] =
    useState<WarehouseLocation | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [inventorySummary, setInventorySummary] = useState<
    Map<string, InventorySummaryItem>
  >(new Map());
  const syncedOnce = useRef(false);

  // Reload cells only - declared before useEffect hooks that depend on it
  const reloadCells = useCallback(async () => {
    try {
      const cellsRes = await fetchWithTimeout("/api/warehouse-cells", {
        cache: "no-store",
      });
      if (cellsRes.ok) {
        const cellsJson = await safeJson<{ data?: WarehouseCell[] }>(cellsRes);
        if (cellsJson?.data) {
          setDbCells(cellsJson.data);
        }
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Reload function for after-save (never unmounts 3D scene)
  const reloadLocations = useCallback(async () => {
    try {
      const rows = await fetchLocations();
      setLocations(rows.filter((row) => row.active));

      // Also reload cells
      try {
        const cellsRes = await fetchWithTimeout("/api/warehouse-cells", {
          cache: "no-store",
        });
        if (cellsRes.ok) {
          const cellsJson = await safeJson<{ data?: WarehouseCell[] }>(cellsRes);
          if (cellsJson?.data) {
            setDbCells(cellsJson.data);
          }
        }
      } catch {
        // Silent fail
      }
    } catch {
      // silent - keep current locations
    }
  }, []);

  // Initial load with cancellation for React Strict Mode safety
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Fetch locations
        let rows = await fetchLocations();
        if (cancelled) return;

        const activePhysicalCount = rows.filter(
          (row) => row.active && !row.is_virtual
        ).length;

        // Sync if locations are missing (only once per session)
        if (activePhysicalCount < EXPECTED_LOCATIONS && !syncedOnce.current) {
          syncedOnce.current = true;
          await triggerSync();
          if (cancelled) return;
          rows = await fetchLocations();
          if (cancelled) return;
        }

        setLocations(rows.filter((row) => row.active));

        // Fetch warehouse cells for DB-driven rendering
        try {
          const cellsRes = await fetchWithTimeout("/api/warehouse-cells", {
            cache: "no-store",
          });
          if (cellsRes.ok) {
            const cellsJson = await safeJson<{ data?: WarehouseCell[] }>(cellsRes);
            if (!cancelled && cellsJson?.data) {
              setDbCells(cellsJson.data);
            }
          }
        } catch {
          // Silent fail - fall back to computed cells
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error
            ? err.message
            : "창고맵 데이터를 불러오지 못했습니다."
        );
        setLocations([]);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for cells-changed event (triggered after delete)
  useEffect(() => {
    function handleCellsChanged() {
      reloadCells();
    }
    window.addEventListener('cells-changed', handleCellsChanged);
    return () => window.removeEventListener('cells-changed', handleCellsChanged);
  }, [reloadCells]);

  // Cell creation handler
  const handleCreateCell = useCallback(async (x: number, z: number) => {
    try {
      const res = await fetchWithTimeout("/api/warehouse-cells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pos_x: x,
          pos_y: 0,
          pos_z: z,
          width: 1.0,
          height: 0.8,
          depth: 1.2,
          cell_type: "shelf",
        }),
      });
      if (!res.ok) throw new Error("셀 생성 실패");
      const json = await safeJson<{ data?: WarehouseCell }>(res);
      const createdCell = json?.data;
      // Optimistic: add to local state immediately
      if (createdCell) {
        setDbCells((prev) => [...prev, createdCell]);
        toast.success("셀 생성 완료");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "셀 생성 실패");
    }
  }, []);

  // Cell move handler (after drag)
  const handleMoveCell = useCallback(
    async (cellId: string, newX: number, newZ: number) => {
      // Optimistic update
      const oldCells = [...dbCells];
      setDbCells((prev) =>
        prev.map((c) => (c.id === cellId ? { ...c, pos_x: newX, pos_z: newZ } : c))
      );

      try {
        const res = await fetchWithTimeout(`/api/warehouse-cells/${cellId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pos_x: newX, pos_z: newZ }),
        });
        if (!res.ok) throw new Error("셀 이동 실패");
        toast.success("셀 이동 완료");
      } catch (e) {
        // Rollback on failure
        setDbCells(oldCells);
        toast.error("셀 이동 실패. 위치가 복원되었습니다.");
      }
    },
    [dbCells]
  );

  // Cell selection handler - receives CellInfo from 3D scene
  const handleSelectCellFromScene = useCallback(
    (cellInfo: {
      x: number;
      y: number;
      z: number;
      width?: number;
      height?: number;
      depth?: number;
      loc: WarehouseLocation | null;
      faceNo: number;
      bay: number;
      level: number;
      cellId?: string;
      cellType?: string;
    }) => {
      if (!onSelectCell) return;

      // If there's a DB cell, pass it
      if (cellInfo.cellId) {
        const cell = dbCells.find((c) => c.id === cellInfo.cellId);
        if (cell) {
          onSelectCell(cell);
          return;
        }
      }

      // For view mode (non-editor), create a temporary cell object for location lookup
      // This allows inventory panel to show even if cell doesn't exist in DB yet
      if (cellInfo.faceNo && cellInfo.bay && cellInfo.level) {
        const tempCell: WarehouseCell = {
          id: `temp-${cellInfo.faceNo}-${cellInfo.bay}-${cellInfo.level}`,
          org_id: '',
          location_id: cellInfo.loc?.id ?? null,
          face_no: cellInfo.faceNo,
          bay_no: cellInfo.bay,
          level_no: cellInfo.level,
          pos_x: cellInfo.x,
          pos_y: cellInfo.y,
          pos_z: cellInfo.z,
          width: cellInfo.width ?? 1.0,
          height: cellInfo.height ?? 0.8,
          depth: cellInfo.depth ?? 1.2,
          cell_type: 'shelf',
          label: null,
          color: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          updated_by: null,
        };
        onSelectCell(tempCell);
      }
    },
    [dbCells, onSelectCell]
  );

  // Fetch inventory summary for color coding
  useEffect(() => {
    if (locations.length === 0) return;
    let cancelled = false;

    fetchWithTimeout("/api/admin/locations/inventory-summary")
      .then((res) => (res.ok ? safeJson<{ data?: InventorySummaryItem[] }>(res) : null))
      .then((json: { data?: InventorySummaryItem[] } | null) => {
        if (cancelled || !json?.data) return;
        const map = new Map<string, InventorySummaryItem>();
        for (const item of json.data) {
          map.set(item.location, item);
        }
        setInventorySummary(map);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [locations]);

  function handleSelectLocation(loc: WarehouseLocation) {
    setSelectedLocation(loc);
    setPanelOpen(true);
    onSelectDecor(null);
  }

  // Handle clicking an empty cell (no DB record yet) - sync + select
  const handleClickEmptyCell = useCallback(
    async (faceNo: number, bay: number, level: number) => {
      const code = buildLocationCode(faceNo, bay, level);
      toast.info(`${code} 위치를 생성 중...`);
      try {
        await triggerSync();
        const rows = await fetchLocations();
        const active = rows.filter((row) => row.active);
        setLocations(active);

        const newLoc = active.find((r) => r.code === code);
        if (newLoc) {
          setSelectedLocation(newLoc);
          setPanelOpen(true);
          onSelectDecor(null);
        }
      } catch {
        toast.error("위치 생성에 실패했습니다.");
      }
    },
    [onSelectDecor]
  );

  function handleClosePanel() {
    setPanelOpen(false);
    setSelectedLocation(null);
  }

  // ALWAYS render the 3D scene - never unmount it.
  // Loading overlay goes ON TOP so the WebGL context is never destroyed.
  return (
    <>
      <div className="relative">
        <Warehouse3DScene
          locations={locations}
          dbCells={dbCells}
          onSelectLocation={handleSelectLocation}
          selectedLocationId={selectedLocation?.id}
          editorMode={editorMode}
          visualMode={visualMode}
          decorItems={decorItems}
          selectedDecorId={selectedDecorId}
          onSelectDecor={onSelectDecor}
          onPlaceDecor={onPlaceDecor}
          inventorySummary={inventorySummary}
          highlightedCodes={highlightedCodes}
          onClickEmptyCell={handleClickEmptyCell}
          temperature={temperature}
          onSelectCell={handleSelectCellFromScene}
          selectedCellId={selectedCell?.id ?? null}
          onCreateCell={handleCreateCell}
          onMoveCell={handleMoveCell}
        />

        {/* Loading overlay - covers the canvas while data loads */}
        {initialLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-cyan-500/20 bg-[#0a0f1e]">
            <div className="flex items-center gap-2 text-cyan-400/60">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm font-mono">창고맵을 불러오는 중...</span>
            </div>
          </div>
        )}
      </div>

      <HologramPanel
        location={selectedLocation}
        isOpen={panelOpen}
        onClose={handleClosePanel}
        onSaved={reloadLocations}
      />
    </>
  );
}
