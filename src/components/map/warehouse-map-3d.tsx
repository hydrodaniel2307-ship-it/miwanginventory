"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HologramPanel } from "./hologram-panel";
import type { WarehouseLocation } from "@/lib/types/database";
import type { DecorItem } from "@/lib/map-layout";

const Warehouse3DScene = dynamic(
  () =>
    import("./warehouse-3d-scene").then((mod) => ({
      default: mod.Warehouse3DScene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-cyan-500/20 bg-[#060a14]">
        <div className="flex items-center gap-2 text-cyan-400/60">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm font-mono">3D 엔진 로딩 중...</span>
        </div>
      </div>
    ),
  }
);

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

type WarehouseMap3DProps = {
  editorMode: boolean;
  visualMode: "dark" | "bright";
  decorItems: DecorItem[];
  selectedDecorId: string | null;
  onSelectDecor: (id: string | null) => void;
  onPlaceDecor: (x: number, z: number) => void;
};

async function fetchLocations(): Promise<WarehouseLocation[]> {
  const res = await fetch("/api/admin/locations", { cache: "no-store" });
  const payload = (await res.json()) as LocationListResponse;

  if (!res.ok) {
    throw new Error(payload.error ?? "창고맵 데이터를 불러오지 못했습니다.");
  }

  return payload.data ?? [];
}

export function WarehouseMap3D({
  editorMode,
  visualMode,
  decorItems,
  selectedDecorId,
  onSelectDecor,
  onPlaceDecor,
}: WarehouseMap3DProps) {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] =
    useState<WarehouseLocation | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      let rows = await fetchLocations();
      const activePhysicalCount = rows.filter(
        (row) => row.active && !row.is_virtual
      ).length;

      if (activePhysicalCount === 0) {
        const syncRes = await fetch("/api/admin/locations/sync", {
          method: "POST",
        });
        const syncPayload = (await syncRes.json()) as SyncResponse;

        if (!syncRes.ok) {
          throw new Error(
            syncPayload.error ?? "위치 생성/갱신 처리에 실패했습니다."
          );
        }

        rows = await fetchLocations();
      }

      setLocations(rows.filter((row) => row.active));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "창고맵 데이터를 불러오지 못했습니다."
      );
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  function handleSelectLocation(loc: WarehouseLocation) {
    setSelectedLocation(loc);
    setPanelOpen(true);
    onSelectDecor(null);
  }

  function handleClosePanel() {
    setPanelOpen(false);
    setSelectedLocation(null);
  }

  if (isLoading) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-cyan-500/20 bg-[#060a14]">
        <div className="flex items-center gap-2 text-cyan-400/60">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm font-mono">창고맵을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Warehouse3DScene
        locations={locations}
        onSelectLocation={handleSelectLocation}
        selectedLocationId={selectedLocation?.id}
        editorMode={editorMode}
        visualMode={visualMode}
        decorItems={decorItems}
        selectedDecorId={selectedDecorId}
        onSelectDecor={onSelectDecor}
        onPlaceDecor={onPlaceDecor}
      />

      <HologramPanel
        location={selectedLocation}
        isOpen={panelOpen}
        onClose={handleClosePanel}
        onSaved={loadLocations}
      />
    </>
  );
}
