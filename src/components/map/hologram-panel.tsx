"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Loader2,
  MapPin,
  Package,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WarehouseLocation } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────
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

type InventoryItem = NonNullable<DetailPayload["data"]>["items"][number];
type Draft = { quantity: number; min_quantity: number };

export type HologramPanelProps = {
  location: WarehouseLocation | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

// ── Styles (injected once via useEffect) ───────────────────────
const HOLOGRAM_STYLES_ID = "hologram-panel-styles";

const hologramCSS = `
@keyframes hologram-in {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes hologram-out {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(40px); }
}
@keyframes holo-scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(var(--panel-height, 600px)); }
}
@keyframes holo-pulse-border {
  0%, 100% {
    border-color: rgba(0, 220, 255, 0.25);
    box-shadow: 0 0 15px rgba(0, 220, 255, 0.1), inset 0 0 15px rgba(0, 220, 255, 0.03);
  }
  50% {
    border-color: rgba(0, 220, 255, 0.5);
    box-shadow: 0 0 25px rgba(0, 220, 255, 0.2), inset 0 0 25px rgba(0, 220, 255, 0.05);
  }
}
@keyframes holo-text-flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.8; }
  94% { opacity: 1; }
  96% { opacity: 0.9; }
  97% { opacity: 1; }
}
.hologram-panel-enter {
  animation: hologram-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hologram-panel-exit {
  animation: hologram-out 0.25s cubic-bezier(0.7, 0, 0.84, 0) forwards;
}
.hologram-scanline::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 220, 255, 0.08) 20%, rgba(0, 220, 255, 0.15) 50%, rgba(0, 220, 255, 0.08) 80%, transparent 100%);
  animation: holo-scanline 4s linear infinite;
  pointer-events: none;
  z-index: 50;
}
.hologram-pulse {
  animation: holo-pulse-border 3s ease-in-out infinite;
}
.holo-text-flicker {
  animation: holo-text-flicker 6s ease-in-out infinite;
}
.holo-corner-tl, .holo-corner-tr, .holo-corner-bl, .holo-corner-br {
  position: absolute; width: 16px; height: 16px; pointer-events: none; z-index: 10;
}
.holo-corner-tl { top: -1px; left: -1px; border-top: 2px solid rgba(0, 220, 255, 0.6); border-left: 2px solid rgba(0, 220, 255, 0.6); }
.holo-corner-tr { top: -1px; right: -1px; border-top: 2px solid rgba(0, 220, 255, 0.6); border-right: 2px solid rgba(0, 220, 255, 0.6); }
.holo-corner-bl { bottom: -1px; left: -1px; border-bottom: 2px solid rgba(0, 220, 255, 0.6); border-left: 2px solid rgba(0, 220, 255, 0.6); }
.holo-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid rgba(0, 220, 255, 0.6); border-right: 2px solid rgba(0, 220, 255, 0.6); }
.holo-scanline-texture {
  background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 220, 255, 0.03) 2px, rgba(0, 220, 255, 0.03) 3px);
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .hologram-panel-enter, .hologram-panel-exit, .hologram-pulse, .holo-text-flicker { animation: none !important; }
  .hologram-panel-enter { opacity: 1; transform: translateX(0); }
  .hologram-scanline::after { animation: none !important; display: none; }
}
`;

function useInjectStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(HOLOGRAM_STYLES_ID)) return;

    const style = document.createElement("style");
    style.id = HOLOGRAM_STYLES_ID;
    style.textContent = hologramCSS;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);
}

// ── Component ──────────────────────────────────────────────────
export function HologramPanel({
  location,
  isOpen,
  onClose,
  onSaved,
}: HologramPanelProps) {
  useInjectStyles();

  const panelRef = useRef<HTMLDivElement>(null);

  const [detail, setDetail] = useState<DetailPayload["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [animState, setAnimState] = useState<"enter" | "exit" | "closed">("closed");

  // ── Open / close with exit animation ──
  useEffect(() => {
    if (isOpen && location) {
      setAnimState("enter");
    } else if (!isOpen && animState === "enter") {
      setAnimState("exit");
      const timer = setTimeout(() => setAnimState("closed"), 250);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location]);

  // ── Fetch detail ──
  const fetchDetail = useCallback(async (loc: WarehouseLocation) => {
    setIsLoading(true);
    setError(null);
    setDetail(null);
    setDrafts({});

    try {
      const res = await fetch(`/api/locations/${loc.id}`, { cache: "no-store" });
      const json = (await res.json()) as DetailPayload;
      if (!res.ok || !json.data) throw new Error(json.error ?? "위치 상세를 불러오지 못했습니다");

      setDetail(json.data);
      setDrafts(
        Object.fromEntries(
          json.data.items.map((it) => [
            it.id,
            { quantity: it.quantity, min_quantity: it.min_quantity },
          ])
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "위치 상세를 불러오지 못했습니다";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location && isOpen) fetchDetail(location);
  }, [location, isOpen, fetchDetail]);

  // ── Scanline height CSS var ──
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.style.setProperty("--panel-height", `${panelRef.current.offsetHeight}px`);
    }
  }, [detail, isLoading]);

  // ── Escape key ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ── Draft helpers ──
  function updateDraft(id: string, field: keyof Draft, val: string) {
    const n = Math.max(0, Number(val) || 0);
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        quantity: field === "quantity" ? n : (prev[id]?.quantity ?? 0),
        min_quantity: field === "min_quantity" ? n : (prev[id]?.min_quantity ?? 0),
      },
    }));
  }

  async function saveItem(itemId: string) {
    if (!location) return;
    const draft = drafts[itemId];
    if (!draft) return;

    setSavingId(itemId);
    try {
      const res = await fetch(`/api/locations/${location.id}/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = (await res.json()) as {
        data?: { id: string; quantity: number; min_quantity: number };
        error?: string;
      };
      if (!res.ok || !json.data) throw new Error(json.error ?? "수정 실패");

      if (detail) {
        setDetail({
          ...detail,
          items: detail.items.map((it) =>
            it.id === itemId
              ? { ...it, quantity: json.data!.quantity, min_quantity: json.data!.min_quantity }
              : it
          ),
        });
      }
      toast.success("내용물 수정 완료");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function copyQrPayload() {
    if (!detail?.qr_payload) return;
    try {
      await navigator.clipboard.writeText(detail.qr_payload);
      toast.success("QR Payload 복사 완료");
    } catch {
      toast.error("클립보드 복사에 실패했습니다");
    }
  }

  const displayLocation = detail?.location ?? location;
  const items: InventoryItem[] = detail?.items ?? [];

  if (animState === "closed" && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${animState === "enter" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="위치 상세 패널"
        className={`fixed top-4 right-4 bottom-4 z-50 w-[calc(100vw-2rem)] max-w-[420px] flex flex-col rounded-xl border border-cyan-500/25 bg-[oklch(0.1_0.01_220/0.85)] backdrop-blur-xl overflow-hidden hologram-scanline hologram-pulse ${animState === "enter" ? "hologram-panel-enter" : "hologram-panel-exit"}`}
      >
        {/* Corner brackets */}
        <div className="holo-corner-tl" />
        <div className="holo-corner-tr" />
        <div className="holo-corner-bl" />
        <div className="holo-corner-br" />

        {/* Shimmer lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="absolute inset-0 holo-scanline-texture z-[1]" />

        {/* ── Header ── */}
        <div className="relative z-[2] shrink-0 px-5 pt-5 pb-4 border-b border-cyan-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <MapPin className="size-4 text-cyan-400" />
                </div>
                <h2
                  className="text-xl font-bold font-mono tracking-wider text-cyan-300 truncate holo-text-flicker"
                  style={{ textShadow: "0 0 12px rgba(0,220,255,0.4)" }}
                >
                  {displayLocation?.code ?? "---"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {displayLocation?.face_no != null && (
                  <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/20 text-cyan-400/80 bg-cyan-500/5">
                    선반 {displayLocation.face_no}
                  </Badge>
                )}
                {displayLocation?.bay_no != null && (
                  <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/20 text-cyan-400/80 bg-cyan-500/5">
                    베이 {displayLocation.bay_no}
                  </Badge>
                )}
                {displayLocation?.level_no != null && (
                  <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/20 text-cyan-400/80 bg-cyan-500/5">
                    {displayLocation.level_no}단
                  </Badge>
                )}
                <Badge
                  variant={displayLocation?.active ? "default" : "destructive"}
                  className={displayLocation?.active ? "text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "text-[10px]"}
                >
                  {displayLocation?.active ? "활성" : "비활성"}
                </Badge>
              </div>

              {displayLocation?.display_name && (
                <p className="mt-1.5 text-xs text-zinc-400 truncate">{displayLocation.display_name}</p>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 size-8 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-200 hover:shadow-[0_0_10px_rgba(0,220,255,0.15)]"
              aria-label="패널 닫기"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="relative z-[2] flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-6 text-cyan-400/60 animate-spin" />
              <p className="text-sm text-zinc-500">데이터 로딩 중...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => location && fetchDetail(location)}
                className="mt-2 text-xs text-zinc-400 hover:text-cyan-300"
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <>
              {/* QR Payload */}
              {detail?.qr_payload && (
                <section>
                  <h3 className="text-[11px] uppercase tracking-widest text-cyan-500/60 font-semibold mb-2" style={{ textShadow: "0 0 6px rgba(0,220,255,0.2)" }}>
                    QR Payload
                  </h3>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-cyan-300/80 truncate flex-1 select-all">
                        {detail.qr_payload}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyQrPayload}
                        className="shrink-0 h-7 px-2 text-[11px] text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                      >
                        <Copy className="mr-1 size-3" />
                        복사
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* Inventory Items */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="size-4 text-cyan-500/60" />
                  <h3 className="text-sm font-semibold text-zinc-200" style={{ textShadow: "0 0 8px rgba(0,220,255,0.15)" }}>
                    칸 내용물
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/20 text-cyan-400/70 bg-cyan-500/5">
                    {items.length}건
                  </Badge>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-700/60 bg-white/[0.02] p-8 text-center">
                    <Package className="mx-auto size-10 text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-500">이 칸에 등록된 재고가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const draft = drafts[item.id] ?? { quantity: item.quantity, min_quantity: item.min_quantity };
                      const isSaving = savingId === item.id;
                      const hasChanges = draft.quantity !== item.quantity || draft.min_quantity !== item.min_quantity;

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 transition-colors duration-200 hover:border-cyan-500/15 hover:bg-cyan-500/[0.02]"
                        >
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">{item.product?.name ?? "미지정 제품"}</p>
                            <p className="text-xs font-mono text-zinc-500 mt-0.5">{item.product?.sku ?? "-"}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-zinc-400">수량</Label>
                              <Input
                                type="number"
                                min={0}
                                value={draft.quantity}
                                onChange={(e) => updateDraft(item.id, "quantity", e.target.value)}
                                disabled={isSaving}
                                className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08] text-zinc-200 focus-visible:border-cyan-500/40 focus-visible:ring-cyan-500/20"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-zinc-400">최소수량</Label>
                              <Input
                                type="number"
                                min={0}
                                value={draft.min_quantity}
                                onChange={(e) => updateDraft(item.id, "min_quantity", e.target.value)}
                                disabled={isSaving}
                                className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08] text-zinc-200 focus-visible:border-cyan-500/40 focus-visible:ring-cyan-500/20"
                              />
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full text-xs transition-all duration-200 ${hasChanges ? "border-cyan-500/30 text-cyan-300 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,220,255,0.1)]" : "border-white/[0.08] text-zinc-500"}`}
                            onClick={() => saveItem(item.id)}
                            disabled={isSaving || !hasChanges}
                          >
                            {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
                            {isSaving ? "저장 중..." : "내용물 수정"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Bottom shimmer */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent z-[2]" />
      </div>
    </>
  );
}
