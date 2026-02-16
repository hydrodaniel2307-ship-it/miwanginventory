"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getReorderSuggestions,
  createReorder,
  batchReorder,
} from "@/app/(protected)/inventory/reorder-actions";
import type { ReorderSuggestion } from "@/lib/stock-alerts";

function formatCurrency(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function ReorderSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="gap-0 py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ReorderItemCardProps {
  suggestion: ReorderSuggestion;
  onReorder: (productId: string, quantity: number) => void;
  isPending: boolean;
  reorderingId: string | null;
}

function ReorderItemCard({
  suggestion,
  onReorder,
  isPending,
  reorderingId,
}: ReorderItemCardProps) {
  const isReordering = reorderingId === suggestion.productId;

  return (
    <Card className="gap-0 border-orange-200 py-0 dark:border-orange-800/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800/40 dark:bg-orange-900/20">
            <Package className="size-4 text-orange-600 dark:text-orange-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">
                {suggestion.productName}
              </p>
              {suggestion.currentQuantity <= 0 && (
                <Badge
                  variant="destructive"
                  className="text-[10px] shrink-0"
                >
                  품절
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span>SKU: {suggestion.productSku}</span>
              <span>
                현재 {suggestion.currentQuantity}개 / 최소{" "}
                {suggestion.minQuantity}개
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-bold">
              +{suggestion.suggestedQuantity}개
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(suggestion.estimatedCost)}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/30"
            disabled={isPending}
            onClick={() =>
              onReorder(suggestion.productId, suggestion.suggestedQuantity)
            }
          >
            {isReordering ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <ShoppingCart className="mr-1.5 size-3.5" />
            )}
            자동 발주
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReorderPanelProps {
  initialSuggestions?: ReorderSuggestion[];
}

export function ReorderPanel({ initialSuggestions }: ReorderPanelProps) {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>(
    initialSuggestions ?? []
  );
  const [isLoading, startLoadTransition] = useTransition();
  const [isReordering, startReorderTransition] = useTransition();
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasFetched, setHasFetched] = useState(!!initialSuggestions);

  const fetchSuggestions = useCallback(() => {
    startLoadTransition(async () => {
      try {
        const data = await getReorderSuggestions();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setHasFetched(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!initialSuggestions) {
      fetchSuggestions();
    }
  }, [initialSuggestions, fetchSuggestions]);

  function handleSingleReorder(productId: string, quantity: number) {
    setReorderingId(productId);
    startReorderTransition(async () => {
      try {
        const result = await createReorder(productId, quantity);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            `발주서 ${result.orderNumber}이(가) 생성되었습니다`
          );
          // Remove the reordered item from the list
          setSuggestions((prev) =>
            prev.filter((s) => s.productId !== productId)
          );
        }
      } catch {
        toast.error("발주 처리 중 오류가 발생했습니다");
      } finally {
        setReorderingId(null);
      }
    });
  }

  function handleBatchReorder() {
    setReorderingId("batch");
    startReorderTransition(async () => {
      try {
        const items = suggestions.map((s) => ({
          productId: s.productId,
          quantity: s.suggestedQuantity,
        }));
        const result = await batchReorder(items);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            `일괄 발주서 ${result.orderNumber}이(가) 생성되었습니다 (${suggestions.length}개 품목)`
          );
          setSuggestions([]);
        }
      } catch {
        toast.error("일괄 발주 처리 중 오류가 발생했습니다");
      } finally {
        setReorderingId(null);
      }
    });
  }

  // Loading skeleton state
  if (isLoading && !hasFetched) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-800/40 dark:bg-orange-950/20">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            발주 제안
          </span>
        </div>
        <ReorderSkeleton />
      </div>
    );
  }

  // Don't render if there are no suggestions
  if (hasFetched && suggestions.length === 0) {
    return null;
  }

  const totalEstimatedCost = suggestions.reduce(
    (sum, s) => sum + s.estimatedCost,
    0
  );

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-800/40 dark:bg-orange-950/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-left"
        >
          <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
          <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            발주 제안
          </span>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 text-[11px] dark:bg-orange-900/40 dark:text-orange-300"
          >
            {suggestions.length}건
          </Badge>
          {isCollapsed ? (
            <ChevronDown className="size-4 text-orange-600 dark:text-orange-400" />
          ) : (
            <ChevronUp className="size-4 text-orange-600 dark:text-orange-400" />
          )}
        </button>

        {!isCollapsed && suggestions.length > 1 && (
          <Button
            size="sm"
            className="bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
            disabled={isReordering}
            onClick={handleBatchReorder}
          >
            {reorderingId === "batch" ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Truck className="mr-1.5 size-3.5" />
            )}
            일괄 발주 ({formatCurrency(totalEstimatedCost)})
          </Button>
        )}
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="mt-3 grid gap-3">
          {suggestions.map((suggestion) => (
            <ReorderItemCard
              key={suggestion.productId}
              suggestion={suggestion}
              onReorder={handleSingleReorder}
              isPending={isReordering}
              reorderingId={reorderingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
