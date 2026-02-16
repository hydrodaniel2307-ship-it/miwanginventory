"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Package,
  MapPin,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  updateInventoryQuantity,
  updateLocation,
  deleteInventoryItem,
  type InventoryRow,
} from "./actions";

type Filter = "all" | "low" | "ok";
type SortKey = "name" | "quantity";
type SortDir = "asc" | "desc";

interface InventoryListProps {
  items: InventoryRow[];
}

function getStatus(row: InventoryRow) {
  if (row.quantity <= 0) return { label: "품절", variant: "destructive" as const };
  if (row.quantity < row.min_quantity)
    return { label: "부족", variant: "default" as const, className: "bg-orange-500 hover:bg-orange-600 text-white" };
  return { label: "충분", variant: "default" as const, className: "bg-emerald-500 hover:bg-emerald-600 text-white" };
}

export function InventoryList({ items }: InventoryListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [qtyDialog, setQtyDialog] = useState<InventoryRow | null>(null);
  const [locDialog, setLocDialog] = useState<InventoryRow | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<InventoryRow | null>(null);
  const [adjustQty, setAdjustQty] = useState("0");
  const [newLocation, setNewLocation] = useState("");

  // Filter & sort
  const filtered = items
    .filter((item) => {
      if (filter === "low")
        return item.quantity <= 0 || item.quantity < item.min_quantity;
      if (filter === "ok") return item.quantity >= item.min_quantity;
      return true;
    })
    .filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.product.name.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        (item.location ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name")
        return a.product.name.localeCompare(b.product.name) * dir;
      return (a.quantity - b.quantity) * dir;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleQuantityUpdate() {
    if (!qtyDialog) return;
    const delta = parseInt(adjustQty) || 0;
    const newQty = qtyDialog.quantity + delta;

    startTransition(async () => {
      const result = await updateInventoryQuantity(qtyDialog.id, newQty);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`수량이 ${newQty}개로 변경되었습니다`);
        setQtyDialog(null);
      }
    });
  }

  function handleLocationUpdate() {
    if (!locDialog) return;

    startTransition(async () => {
      const result = await updateLocation(locDialog.id, newLocation);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("위치가 변경되었습니다");
        setLocDialog(null);
      }
    });
  }

  function handleDelete() {
    if (!deleteDialog) return;

    startTransition(async () => {
      const result = await deleteInventoryItem(deleteDialog.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("재고 기록이 삭제되었습니다");
        setDeleteDialog(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="상품명, SKU, 위치 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["all", "전체"],
              ["low", "재고 부족"],
              ["ok", "충분"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSort("name")}
          className="text-xs"
        >
          <ArrowUpDown className="mr-1 size-3" />
          상품명 {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSort("quantity")}
          className="text-xs"
        >
          <ArrowUpDown className="mr-1 size-3" />
          수량 {sortKey === "quantity" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </Button>
      </div>

      {/* Inventory List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
            <Package className="size-5 text-muted-foreground" />
          </div>
          <p className="font-medium">재고 데이터가 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">
            스캔 페이지에서 입고를 처리하면 재고가 등록됩니다
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const status = getStatus(item);
            return (
              <Card key={item.id} className="gap-0 py-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Product image */}
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        unoptimized={item.product.image_url.startsWith("data:")}
                        className="size-12 shrink-0 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <Package className="size-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {item.product.name}
                        </p>
                        <Badge
                          variant={status.variant}
                          className={`shrink-0 text-[11px] ${status.className ?? ""}`}
                        >
                          {status.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                        <span>SKU: {item.product.sku}</span>
                        {item.product.category && (
                          <span>{item.product.category.name}</span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="size-3" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{item.quantity}</p>
                      <p className="text-[11px] text-muted-foreground">
                        최소 {item.min_quantity}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          setQtyDialog(item);
                          setAdjustQty("0");
                        }}
                        title="수량 조정"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          setLocDialog(item);
                          setNewLocation(item.location ?? "");
                        }}
                        title="위치 변경"
                      >
                        <MapPin className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog(item)}
                        title="삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quantity Dialog */}
      <Dialog open={!!qtyDialog} onOpenChange={() => setQtyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수량 조정</DialogTitle>
          </DialogHeader>
          {qtyDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {qtyDialog.product.name} (현재: {qtyDialog.quantity}개)
              </p>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="조정 수량 (+/-)"
              />
              <div className="flex flex-wrap gap-2">
                {[-10, -5, -1, 1, 5, 10].map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustQty(String(n))}
                  >
                    {n > 0 ? `+${n}` : n}
                  </Button>
                ))}
              </div>
              <p className="text-sm">
                변경 후 수량:{" "}
                <span className="font-bold">
                  {qtyDialog.quantity + (parseInt(adjustQty) || 0)}개
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleQuantityUpdate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={!!locDialog} onOpenChange={() => setLocDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>위치 변경</DialogTitle>
          </DialogHeader>
          {locDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {locDialog.product.name} (현재: {locDialog.location ?? "미지정"})
              </p>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="새 위치 (예: A-1-3)"
              />
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button onClick={handleLocationUpdate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재고 삭제</DialogTitle>
          </DialogHeader>
          {deleteDialog && (
            <p className="text-sm text-muted-foreground">
              <strong>{deleteDialog.product.name}</strong>의 재고 기록을
              삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
