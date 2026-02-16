"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Loader2,
  MapPin,
  Printer,
  RefreshCcw,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WarehouseLocation } from "@/lib/types/database";

type LocationListResponse = {
  data: WarehouseLocation[];
  error?: string;
};

type LocationDetailResponse = {
  data?: {
    location: WarehouseLocation;
    qr_payload: string;
    items: {
      id: string;
      quantity: number;
      min_quantity: number;
      updated_at: string;
      product: { id: string; name: string; sku: string } | null;
    }[];
  };
  error?: string;
};

type LocationDetailData = NonNullable<LocationDetailResponse["data"]>;

type InventoryDraft = {
  quantity: number;
  min_quantity: number;
};

export function LocationsBrowser() {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [faceFilter, setFaceFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const [items, setItems] = useState<LocationDetailData["items"]>([]);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, InventoryDraft>>(
    {}
  );
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (faceFilter !== "all") params.set("face_no", faceFilter);
      if (query.trim()) params.set("q", query.trim());

      const response = await fetch(`/api/admin/locations?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LocationListResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "위치 목록을 불러오지 못했습니다.");
      }

      setLocations(payload.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "위치 목록을 불러오지 못했습니다."
      );
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, [faceFilter, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLocations();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadLocations]);

  const stageLocations = useMemo(
    () =>
      locations.filter((location) => location.code === "STAGE-IN" || location.code === "STAGE-OUT"),
    [locations]
  );

  const physicalLocations = useMemo(
    () => locations.filter((location) => !location.is_virtual),
    [locations]
  );

  async function openDetail(location: WarehouseLocation) {
    setSelectedLocation(location);
    setSheetOpen(true);
    setDetailLoading(true);
    setQrPayload("");
    setItems([]);
    setInventoryDrafts({});

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LocationDetailResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "위치 상세를 불러오지 못했습니다.");
      }

      setSelectedLocation(payload.data.location);
      setQrPayload(payload.data.qr_payload);
      setItems(payload.data.items);
      setInventoryDrafts(
        Object.fromEntries(
          payload.data.items.map((item) => [
            item.id,
            { quantity: item.quantity, min_quantity: item.min_quantity },
          ])
        )
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "위치 상세를 불러오지 못했습니다."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function updateDraft(itemId: string, field: keyof InventoryDraft, value: string) {
    const parsed = Number(value);
    setInventoryDrafts((prev) => ({
      ...prev,
      [itemId]: {
        quantity:
          field === "quantity"
            ? Number.isFinite(parsed)
              ? Math.max(0, parsed)
              : 0
            : (prev[itemId]?.quantity ?? 0),
        min_quantity:
          field === "min_quantity"
            ? Number.isFinite(parsed)
              ? Math.max(0, parsed)
              : 0
            : (prev[itemId]?.min_quantity ?? 0),
      },
    }));
  }

  async function saveItem(itemId: string) {
    if (!selectedLocation) return;
    const draft = inventoryDrafts[itemId];
    if (!draft) return;

    setSavingInventoryId(itemId);
    try {
      const response = await fetch(
        `/api/locations/${selectedLocation.id}/inventory/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }
      );

      const payload = (await response.json()) as {
        data?: { id: string; quantity: number; min_quantity: number };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "재고 수정에 실패했습니다.");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: payload.data!.quantity,
                min_quantity: payload.data!.min_quantity,
              }
            : item
        )
      );
      toast.success("칸 내용물이 수정되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "재고 수정에 실패했습니다.");
    } finally {
      setSavingInventoryId(null);
    }
  }

  async function copyQrPayload() {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      toast.success("QR Payload를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">위치 조회</CardTitle>
          <Button variant="outline" size="sm" onClick={loadLocations}>
            <RefreshCcw className="mr-2 size-3.5" />
            새로고침
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[160px_1fr]">
            <Select value={faceFilter} onValueChange={setFaceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="선반 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 선반</SelectItem>
                {Array.from({ length: 11 }, (_, idx) => idx + 1).map((faceNo) => (
                  <SelectItem key={faceNo} value={String(faceNo)}>
                    선반 {faceNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="코드/베이/단 검색"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { code: "STAGE-IN", label: "입고대기" },
              { code: "STAGE-OUT", label: "출고대기" },
            ].map((stage) => {
              const found = stageLocations.find((item) => item.code === stage.code);
              return (
                <div
                  key={stage.code}
                  className="rounded-lg border bg-muted/40 px-3 py-2.5"
                >
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold">{stage.code}</span>
                    <Badge variant={found?.active ? "default" : "secondary"}>
                      {found?.active ? "활성" : "비활성"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              위치 목록을 불러오는 중입니다...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>코드</TableHead>
                  <TableHead>선반</TableHead>
                  <TableHead>베이</TableHead>
                  <TableHead>단</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead>가상위치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {physicalLocations.map((location) => (
                  <TableRow
                    key={location.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(location)}
                  >
                    <TableCell className="font-medium">{location.code}</TableCell>
                    <TableCell>{location.face_no}</TableCell>
                    <TableCell>{location.bay_no}</TableCell>
                    <TableCell>{location.level_no}</TableCell>
                    <TableCell>
                      <Badge variant={location.active ? "default" : "secondary"}>
                        {location.active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_virtual ? "outline" : "secondary"}>
                        {location.is_virtual ? "예" : "아니오"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {physicalLocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      검색 조건에 맞는 위치가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-xl border-l border-cyan-300/40 bg-gradient-to-b from-cyan-500/10 via-background to-background backdrop-blur-xl"
          side="right"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-cyan-500" />
              {selectedLocation?.code ?? "위치 상세"}
            </SheetTitle>
            <SheetDescription>
              위치 정보와 칸 내용물을 확인하고 수정합니다.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto">
            {detailLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                상세 정보를 불러오는 중입니다...
              </div>
            ) : (
              <>
                {selectedLocation && (
                  <Card className="border-cyan-300/30">
                    <CardContent className="space-y-2 p-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>선반: {selectedLocation.face_no ?? "-"}</div>
                        <div>베이: {selectedLocation.bay_no ?? "-"}</div>
                        <div>단: {selectedLocation.level_no ?? "-"}</div>
                        <div>
                          상태:{" "}
                          <Badge
                            variant={selectedLocation.active ? "default" : "secondary"}
                          >
                            {selectedLocation.active ? "활성" : "비활성"}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-md border bg-muted/40 p-2.5">
                        <p className="text-xs text-muted-foreground">QR Payload</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <code className="text-xs">{qrPayload || `LOC:${selectedLocation.id}`}</code>
                          <Button variant="outline" size="sm" onClick={copyQrPayload}>
                            <Copy className="mr-1.5 size-3.5" />
                            복사
                          </Button>
                        </div>
                      </div>
                      <Button variant="outline" disabled className="w-full">
                        <Printer className="mr-2 size-4" />
                        위치 라벨 출력 (준비중)
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">칸 내용물</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.length === 0 ? (
                      <div className="rounded-md border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">
                        이 위치에 등록된 재고가 없습니다.
                      </div>
                    ) : (
                      items.map((item) => {
                        const draft = inventoryDrafts[item.id] ?? {
                          quantity: item.quantity,
                          min_quantity: item.min_quantity,
                        };

                        return (
                          <div key={item.id} className="rounded-md border p-3">
                            <p className="text-sm font-semibold">{item.product?.name ?? "미지정 제품"}</p>
                            <p className="text-xs text-muted-foreground">{item.product?.sku ?? "-"}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">수량</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={draft.quantity}
                                  onChange={(event) =>
                                    updateDraft(item.id, "quantity", event.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">최소수량</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={draft.min_quantity}
                                  onChange={(event) =>
                                    updateDraft(item.id, "min_quantity", event.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 w-full"
                              onClick={() => saveItem(item.id)}
                              disabled={savingInventoryId === item.id}
                            >
                              {savingInventoryId === item.id ? (
                                <Loader2 className="mr-2 size-3.5 animate-spin" />
                              ) : (
                                <Save className="mr-2 size-3.5" />
                              )}
                              내용물 수정
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
