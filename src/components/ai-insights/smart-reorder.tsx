"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingDown, Package } from "lucide-react";
import { toast } from "sonner";
import { batchReorder } from "@/app/(protected)/inventory/reorder-actions";
import type { SmartReorderResult } from "@/lib/ai-insights";

interface SmartReorderProps {
  data: SmartReorderResult;
}

export function SmartReorder({ data }: SmartReorderProps) {
  const [isOrdering, setIsOrdering] = useState(false);

  if (data.items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">스마트 발주</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  const handleBatchReorder = async () => {
    const reorderItems = data.items
      .filter((i) => i.needsReorder)
      .map((i) => ({
        productId: i.productId,
        quantity: i.eoq,
      }));

    if (reorderItems.length === 0) {
      toast.info("발주가 필요한 상품이 없습니다");
      return;
    }

    setIsOrdering(true);
    try {
      const result = await batchReorder(reorderItems);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `일괄 발주 완료 — 주문번호: ${result.orderNumber} (${reorderItems.length}개 품목)`
        );
      }
    } catch {
      toast.error("발주 처리 중 오류가 발생했습니다");
    } finally {
      setIsOrdering(false);
    }
  };

  const savingsPercent =
    data.totalCurrentCost > 0
      ? ((data.totalSavings / data.totalCurrentCost) * 100).toFixed(1)
      : "0";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">스마트 발주 (EOQ)</CardTitle>
            <CardDescription className="text-[13px]">
              경제적 주문량 기반 발주 최적화
            </CardDescription>
          </div>
          {data.reorderNeededCount > 0 && (
            <Button
              size="sm"
              onClick={handleBatchReorder}
              disabled={isOrdering}
              className="gap-1.5"
            >
              <ShoppingCart className="size-3.5" />
              {isOrdering ? "처리중..." : `일괄 발주 (${data.reorderNeededCount}건)`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Summary */}
        {data.totalSavings > 0 && (
          <div className="flex items-center gap-3 rounded-lg border bg-emerald-500/5 p-3">
            <TrendingDown className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-[12px]">
              <span className="font-medium">
                EOQ 적용 시 연간 ₩
                {data.totalSavings.toLocaleString()} 절감 가능
              </span>
              <span className="text-muted-foreground ml-1">
                ({savingsPercent}% 비용 절감)
              </span>
            </div>
          </div>
        )}

        {/* Reorder Table */}
        <div className="max-h-[350px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[12px]">상품</TableHead>
                <TableHead className="text-[12px] text-right">
                  현재고
                </TableHead>
                <TableHead className="text-[12px] text-right">
                  발주점
                </TableHead>
                <TableHead className="text-[12px] text-right">
                  EOQ
                </TableHead>
                <TableHead className="text-[12px] text-right">
                  안전재고
                </TableHead>
                <TableHead className="text-[12px] text-center">
                  상태
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="text-[12px]">
                    <div className="font-medium max-w-[120px] truncate">
                      {item.productName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.sku}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">
                    {item.currentStock}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">
                    {item.reorderPoint}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums font-medium">
                    {item.eoq}
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">
                    {item.safetyStock}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.needsReorder ? (
                      <Badge variant="destructive" className="text-[10px]">
                        발주 필요
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        충분
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
        <Package className="size-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium">분석할 데이터가 없습니다</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        판매 데이터가 쌓이면 EOQ 분석이 표시됩니다
      </p>
    </div>
  );
}
