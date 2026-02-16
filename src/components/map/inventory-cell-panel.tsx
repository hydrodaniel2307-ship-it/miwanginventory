"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Package, X, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──────────────────────────────────────────────────────

type InventoryItem = {
  id: string;
  quantity: number;
  min_quantity: number;
  location_code: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    unit_price: number;
    cost_price: number;
    image_url: string | null;
  } | null;
};

type InventoryResponse = {
  data?: InventoryItem[];
  error?: string;
};

export type InventoryCellPanelProps = {
  locationCode: string | null;
  cellId?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

// ── Styles (injected once via useEffect) ───────────────────────
const STYLES_ID = "inventory-cell-panel-styles";

const hologramCSS = `
@keyframes panel-slide-in {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes panel-slide-out {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(40px); }
}
.inventory-panel-enter {
  animation: panel-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.inventory-panel-exit {
  animation: panel-slide-out 0.2s cubic-bezier(0.7, 0, 0.84, 0) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .inventory-panel-enter, .inventory-panel-exit { animation: none !important; }
  .inventory-panel-enter { opacity: 1; transform: translateX(0); }
}
`;

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLES_ID)) return;

    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = hologramCSS;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);
}

// ── Component ──────────────────────────────────────────────────
export function InventoryCellPanel({
  locationCode,
  cellId,
  isOpen,
  onClose,
}: InventoryCellPanelProps) {
  useInjectStyles();

  const panelRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animState, setAnimState] = useState<"enter" | "exit" | "closed">("closed");

  // ── Open / close with exit animation ──
  useEffect(() => {
    if (isOpen && locationCode) {
      setAnimState("enter");
    } else if (!isOpen && animState === "enter") {
      setAnimState("exit");
      const timer = setTimeout(() => setAnimState("closed"), 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, locationCode]);

  // ── Fetch inventory ──
  const fetchInventory = useCallback(async (code: string, cid?: string | null) => {
    setIsLoading(true);
    setError(null);
    setItems([]);

    try {
      // Prefer cell_id over location_code for precision
      const params = new URLSearchParams();
      if (cid) {
        params.set("cell_id", cid);
      } else {
        params.set("location_code", code);
      }

      const res = await fetch(
        `/api/admin/inventory?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as InventoryResponse;

      if (!res.ok || !json.data) {
        throw new Error(json.error ?? "재고를 불러오지 못했습니다");
      }

      setItems(json.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "재고를 불러오지 못했습니다";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locationCode && isOpen) {
      fetchInventory(locationCode, cellId);
    }
  }, [locationCode, cellId, isOpen, fetchInventory]);

  // ── Escape key ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (animState === "closed" && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          animState === "enter" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="위치 재고 패널"
        className={`fixed top-4 right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-[420px] flex flex-col rounded-xl border bg-card shadow-2xl overflow-hidden ${
          animState === "enter" ? "inventory-panel-enter" : "inventory-panel-exit"
        }`}
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <MapPin className="size-4 text-primary" />
                </div>
                <h2 className="text-xl font-bold font-mono tracking-wider text-foreground truncate">
                  {locationCode ?? "---"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Package className="size-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">위치 재고 현황</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 size-8 rounded-lg"
              aria-label="패널 닫기"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-5 py-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="size-6 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
                  <AlertCircle className="mx-auto size-5 text-destructive mb-2" />
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => locationCode && fetchInventory(locationCode)}
                    className="mt-2 text-xs"
                  >
                    다시 시도
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                  <Package className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">재고 없음</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    이 위치에 등록된 재고가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">재고 목록</p>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {items.length}건
                    </Badge>
                  </div>

                  {items.map((item) => {
                    const isLowStock =
                      item.quantity > 0 && item.quantity <= item.min_quantity;
                    const isOutOfStock = item.quantity === 0;

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border bg-card/50 p-4 space-y-3 transition-colors hover:border-primary/30 hover:bg-card/80"
                      >
                        {/* Product info */}
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {item.product?.name ?? "미지정 제품"}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            SKU: {item.product?.sku ?? "-"}
                          </p>
                        </div>

                        {/* Quantity info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground">수량</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold font-mono text-foreground">
                                {item.quantity}
                              </p>
                              {isOutOfStock && (
                                <Badge variant="destructive" className="text-[10px]">
                                  재고없음
                                </Badge>
                              )}
                              {isLowStock && !isOutOfStock && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                >
                                  부족
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground">최소수량</p>
                            <p className="text-lg font-bold font-mono text-muted-foreground/70">
                              {item.min_quantity}
                            </p>
                          </div>
                        </div>

                        {/* Status indicator */}
                        {item.quantity > 0 && item.quantity > item.min_quantity && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                          >
                            정상 재고
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
