import { getInventoryList, getInventorySummary, getProductsForSelect } from "./actions";
import { getReorderSuggestions } from "./reorder-actions";
import { InventoryList } from "./inventory-list";
import { ReorderPanel } from "@/components/inventory/reorder-panel";
import { AddInventoryDialog } from "@/components/inventory/add-inventory-dialog";
import { Package, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function InventoryPage() {
  const [items, summary, reorderSuggestions, products] = await Promise.all([
    getInventoryList(),
    getInventorySummary(),
    getReorderSuggestions(),
    getProductsForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Package className="size-[18px] text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">재고 목록</h1>
            <p className="text-[13px] text-muted-foreground">전체 재고를 확인하세요</p>
          </div>
        </div>
        <AddInventoryDialog products={products} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="gap-0 py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-4" />
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">전체 품목</p>
              <p className="text-lg font-bold">{summary.totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">재고 부족</p>
              <p className="text-lg font-bold">{summary.lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-4" />
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">총 재고 가치</p>
              <p className="text-lg font-bold">{summary.totalValue}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {reorderSuggestions.length > 0 && (
        <ReorderPanel initialSuggestions={reorderSuggestions} />
      )}

      <InventoryList items={items} />
    </div>
  );
}
