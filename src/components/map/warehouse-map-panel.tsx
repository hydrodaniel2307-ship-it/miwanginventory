"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  DoorOpen,
  Snowflake,
  MapPin,
  Copy,
  Save,
  BoxSelect,
  AlertTriangle,
  PackageOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { WarehouseLocation } from "@/lib/types/database";

// ── Types ─────────────────────────────────────────────────────────
type LocationList = { data: WarehouseLocation[]; error?: string };

type InventorySummaryItem = {
  location: string;
  totalQty: number;
  itemCount: number;
  hasLowStock: boolean;
};

type DetailPayload = {
  data?: {
    location: WarehouseLocation;
    qr_payload: string;
    items: {
      id: string;
      quantity: number;
      min_quantity: number;
      product: { id: string; name: string; sku: string } | null;
    }[];
  };
  error?: string;
};

type Draft = { quantity: number; min_quantity: number };

// ── Constants ─────────────────────────────────────────────────────

const faceLetter = (n: number) => String.fromCharCode(64 + n);

// ── Cell status helper ────────────────────────────────────────────
type CellStatus = "empty" | "normal" | "low" | "out";

function getCellStatus(summary?: InventorySummaryItem): CellStatus {
  if (!summary || summary.itemCount === 0) return "empty";
  if (summary.totalQty === 0) return "out";
  if (summary.hasLowStock) return "low";
  return "normal";
}

const statusConfig: Record<
  CellStatus,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  empty: {
    bg: "bg-muted/40",
    border: "border-border/50",
    text: "text-muted-foreground/60",
    dot: "bg-muted-foreground/30",
    label: "빈 칸",
  },
  normal: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/50",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    label: "정상",
  },
  low: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "부족",
  },
  out: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/50",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    label: "품절",
  },
};

// ── Component ─────────────────────────────────────────────────────
export function WarehouseMapPanel({
  temperature,
  onTemperatureChange,
}: {
  temperature?: number;
  onTemperatureChange?: (temp: number) => void;
}) {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inventorySummary, setInventorySummary] = useState<
    Map<string, InventorySummaryItem>
  >(new Map());

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<WarehouseLocation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const [items, setItems] = useState<
    NonNullable<DetailPayload["data"]>["items"]
  >([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // ── Data loading ──
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/locations", { cache: "no-store" });
      const json = (await res.json()) as LocationList;
      if (!res.ok) throw new Error(json.error ?? "로드 실패");
      const active = (json.data ?? []).filter((r) => r.active);
      setLocations(active);

      // Fetch inventory summary for all locations
      await loadInventorySummary(active);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "창고맵 로드 실패");
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInventorySummary = useCallback(
    async (locs: WarehouseLocation[]) => {
      // Fetch inventory items grouped by location code
      const codes = locs
        .filter((l) => !l.is_virtual && l.code)
        .map((l) => l.code);
      if (codes.length === 0) return;

      try {
        const res = await fetch("/api/admin/locations/inventory-summary", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as {
            data: InventorySummaryItem[];
          };
          const map = new Map<string, InventorySummaryItem>();
          for (const item of json.data ?? []) {
            map.set(item.location, item);
          }
          setInventorySummary(map);
        }
      } catch {
        // Silently fail - summary is a nice-to-have
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived: group by face ──
  const faceMap = useMemo(() => {
    const map = new Map<number, WarehouseLocation[]>();
    for (const loc of locations) {
      if (loc.is_virtual || loc.face_no == null) continue;
      const arr = map.get(loc.face_no) || [];
      arr.push(loc);
      map.set(loc.face_no, arr);
    }
    return map;
  }, [locations]);

  const faceGrid = useCallback(
    (faceNo: number) => {
      const locs = faceMap.get(faceNo) || [];
      return { bays: 10, levels: 4, locations: locs };
    },
    [faceMap]
  );

  // ── Cell click → Sheet ──
  async function openCell(loc: WarehouseLocation) {
    setSelected(loc);
    setSheetOpen(true);
    setDetailLoading(true);
    setQrPayload("");
    setItems([]);
    setDrafts({});

    try {
      const res = await fetch(`/api/locations/${loc.id}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as DetailPayload;
      if (!res.ok || !json.data)
        throw new Error(json.error ?? "상세 로드 실패");
      setSelected(json.data.location);
      setQrPayload(json.data.qr_payload);
      setItems(json.data.items);
      setDrafts(
        Object.fromEntries(
          json.data.items.map((it) => [
            it.id,
            { quantity: it.quantity, min_quantity: it.min_quantity },
          ])
        )
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "위치 상세를 불러오지 못했습니다"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function copyQr() {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      toast.success("QR Payload 복사 완료");
    } catch {
      toast.error("복사 실패");
    }
  }

  function updateDraft(id: string, field: keyof Draft, val: string) {
    const n = Math.max(0, Number(val) || 0);
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        quantity: field === "quantity" ? n : (prev[id]?.quantity ?? 0),
        min_quantity:
          field === "min_quantity" ? n : (prev[id]?.min_quantity ?? 0),
      },
    }));
  }

  async function saveItem(id: string) {
    if (!selected) return;
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      const res = await fetch(
        `/api/locations/${selected.id}/inventory/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }
      );
      const json = (await res.json()) as {
        data?: { id: string; quantity: number; min_quantity: number };
        error?: string;
      };
      if (!res.ok || !json.data)
        throw new Error(json.error ?? "수정 실패");
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                quantity: json.data!.quantity,
                min_quantity: json.data!.min_quantity,
              }
            : it
        )
      );
      toast.success("내용물 수정 완료");
      // Refresh summary
      loadInventorySummary(locations);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setSavingId(null);
    }
  }

  // ── Render: single cell ──
  function renderCell(
    loc: WarehouseLocation | null,
    bayIdx: number,
    levelIdx: number
  ) {
    const summary = loc ? inventorySummary.get(loc.code) : undefined;
    const status = loc ? getCellStatus(summary) : "empty";
    const cfg = statusConfig[status];

    if (!loc) {
      return (
        <div
          key={`empty-${bayIdx}-${levelIdx}`}
          className="h-10 rounded-[3px] border border-dashed border-border/30 bg-muted/20"
        />
      );
    }

    const cellContent = (
      <button
        onClick={() => openCell(loc)}
        className={cn(
          "group relative h-10 w-full rounded-[3px] border transition-all duration-150",
          "hover:ring-2 hover:ring-primary/30 hover:shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          cfg.bg,
          cfg.border
        )}
      >
        {/* Status dot */}
        <div
          className={cn(
            "absolute top-1 right-1 size-1.5 rounded-full",
            cfg.dot
          )}
        />
        {/* Content */}
        {summary && summary.itemCount > 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <span className={cn("text-[10px] font-bold tabular-nums", cfg.text)}>
              {summary.totalQty}
            </span>
          </div>
        )}
      </button>
    );

    return (
      <Tooltip key={loc.id}>
        <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">{loc.code}</p>
          <p className="text-muted-foreground">
            {loc.display_name ?? `${faceLetter(loc.face_no!)}열 ${loc.bay_no}칸 ${loc.level_no}단`}
          </p>
          {summary && summary.itemCount > 0 ? (
            <p className={cfg.text}>
              {summary.itemCount}종 - 총 {summary.totalQty}개
            </p>
          ) : (
            <p className="text-muted-foreground">비어있음</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // ── Main render ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        <span className="text-sm">창고맵을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* ── Floor Plan ── */}
        <div className="relative overflow-x-auto rounded-xl border bg-card shadow-sm">
          {/* Floor plan header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BoxSelect className="size-4 text-primary" />
              창고 배치도
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {/* Legend */}
              {(["normal", "low", "out", "empty"] as CellStatus[]).map(
                (status) => (
                  <div key={status} className="flex items-center gap-1">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        statusConfig[status].dot
                      )}
                    />
                    {statusConfig[status].label}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Floor plan body */}
          <div className="min-w-[600px] p-5">
            <div className="flex flex-col gap-2">
              {/* 11 face rows rendered sequentially */}
              {Array.from({ length: 11 }, (_, i) => i + 1).map((faceNo) => (
                <div key={faceNo} className="flex items-center gap-2">
                  {/* Face label */}
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      faceMap.has(faceNo)
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    F{faceNo}
                  </div>
                  {/* Cell grid for this face */}
                  {(() => {
                    const { bays, levels, locations: locs } = faceGrid(faceNo);
                    return (
                      <div
                        className="grid flex-1 gap-[3px]"
                        style={{
                          gridTemplateColumns: `repeat(${bays}, minmax(28px, 1fr))`,
                        }}
                      >
                        {Array.from({ length: levels }, (_, levelIdx) => {
                          const level = levels - levelIdx;
                          return Array.from({ length: bays }, (_, bayIdx) => {
                            const bay = bayIdx + 1;
                            const loc =
                              locs.find(
                                (l) =>
                                  l.bay_no === bay && l.level_no === level
                              ) ?? null;
                            return renderCell(loc, bayIdx, levelIdx);
                          });
                        })}
                      </div>
                    );
                  })()}
                  {/* Face letter */}
                  <span className="w-6 shrink-0 text-center text-[10px] font-medium text-muted-foreground">
                    {faceLetter(faceNo)}열
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom row: entrance + cold storage */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5">
                <DoorOpen className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  문 / 출구
                </span>
              </div>

              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border-2 border-dashed px-3 py-1.5",
                  "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30"
                )}
              >
                <Snowflake className="size-3.5 text-sky-500" />
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  냉장고
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard
            icon={<Package className="size-4" />}
            label="전체 위치"
            value={locations.filter((l) => !l.is_virtual).length}
          />
          <SummaryCard
            icon={<PackageOpen className="size-4" />}
            label="사용 중"
            value={
              Array.from(inventorySummary.values()).filter(
                (s) => s.itemCount > 0
              ).length
            }
            className="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            icon={<AlertTriangle className="size-4" />}
            label="재고 부족"
            value={
              Array.from(inventorySummary.values()).filter((s) => s.hasLowStock)
                .length
            }
            className="text-amber-600 dark:text-amber-400"
          />
          <SummaryCard
            icon={<MapPin className="size-4" />}
            label="빈 위치"
            value={
              locations.filter((l) => !l.is_virtual).length -
              Array.from(inventorySummary.values()).filter(
                (s) => s.itemCount > 0
              ).length
            }
            className="text-muted-foreground"
          />
        </div>

        {/* ── Cell Detail Sheet ── */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                  <MapPin className="size-3.5 text-primary" />
                </div>
                {selected?.code ?? "위치 상세"}
              </SheetTitle>
              <SheetDescription>
                {selected?.display_name ??
                  "셀 정보를 확인하고 내용물을 관리합니다"}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4 pb-6">
              <div className="space-y-4 pt-2">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    로딩 중...
                  </div>
                ) : (
                  <>
                    {/* Location info */}
                    {selected && (
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              선반
                            </p>
                            <p className="font-semibold">
                              {selected.face_no
                                ? `${faceLetter(selected.face_no)} (${selected.face_no})`
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              베이
                            </p>
                            <p className="font-semibold">
                              {selected.bay_no ?? "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              단
                            </p>
                            <p className="font-semibold">
                              {selected.level_no ?? "-"}
                            </p>
                          </div>
                        </div>

                        {/* QR Payload */}
                        <Separator />
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-1">
                            QR Payload
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-xs text-primary truncate">
                              {qrPayload || `LOC:${selected.id}`}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-7 text-[11px]"
                              onClick={copyQr}
                            >
                              <Copy className="mr-1 size-3" />
                              복사
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inventory items */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">칸 내용물</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {items.length}건
                        </Badge>
                      </div>

                      {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <Package className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            이 칸에 등록된 재고가 없습니다
                          </p>
                        </div>
                      ) : (
                        items.map((item) => {
                          const draft = drafts[item.id] ?? {
                            quantity: item.quantity,
                            min_quantity: item.min_quantity,
                          };
                          const isLow =
                            draft.quantity < draft.min_quantity &&
                            draft.min_quantity > 0;
                          const isOut = draft.quantity === 0;
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "rounded-lg border p-4 space-y-3",
                                isOut
                                  ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                                  : isLow
                                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                                    : ""
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-semibold">
                                    {item.product?.name ?? "미지정 제품"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.product?.sku ?? "-"}
                                  </p>
                                </div>
                                {isOut && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    품절
                                  </Badge>
                                )}
                                {!isOut && isLow && (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 text-[10px]"
                                  >
                                    부족
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px]">수량</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={draft.quantity}
                                    onChange={(e) =>
                                      updateDraft(
                                        item.id,
                                        "quantity",
                                        e.target.value
                                      )
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px]">
                                    최소수량
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={draft.min_quantity}
                                    onChange={(e) =>
                                      updateDraft(
                                        item.id,
                                        "min_quantity",
                                        e.target.value
                                      )
                                    }
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => saveItem(item.id)}
                                disabled={savingId === item.id}
                              >
                                {savingId === item.id ? (
                                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                ) : (
                                  <Save className="mr-1.5 size-3.5" />
                                )}
                                내용물 수정
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

// ── Summary card sub-component ────────────────────────────────────
function SummaryCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={cn("text-muted-foreground", className)}>{icon}</div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}
