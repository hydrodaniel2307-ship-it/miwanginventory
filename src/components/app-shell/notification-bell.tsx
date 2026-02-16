"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Bell, AlertTriangle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getStockAlerts } from "@/app/(protected)/inventory/reorder-actions";
import type { StockAlert } from "@/lib/stock-alerts";

function AlertIcon({ type }: { type: StockAlert["type"] }) {
  switch (type) {
    case "out_of_stock":
      return <XCircle className="size-4 shrink-0 text-red-500" />;
    case "critical":
      return <AlertTriangle className="size-4 shrink-0 text-orange-500" />;
    case "low_stock":
      return <AlertCircle className="size-4 shrink-0 text-yellow-500" />;
  }
}

function AlertTypeBadge({ type }: { type: StockAlert["type"] }) {
  switch (type) {
    case "out_of_stock":
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          품절
        </span>
      );
    case "critical":
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          위험
        </span>
      );
    case "low_stock":
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          부족
        </span>
      );
  }
}

function AlertSkeleton() {
  return (
    <div className="space-y-3 p-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, startTransition] = useTransition();
  const [hasFetched, setHasFetched] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchAlerts = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStockAlerts();
        setAlerts(data);
      } catch {
        // Silently fail - notification is non-critical
        setAlerts([]);
      } finally {
        setHasFetched(true);
      }
    });
  }, []);

  // Fetch alerts on mount
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Refetch when popover opens
  useEffect(() => {
    if (open) {
      fetchAlerts();
    }
  }, [open, fetchAlerts]);

  const alertCount = alerts.length;
  const displayAlerts = alerts.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-7">
          <Bell className="size-4" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex size-4 items-center justify-center p-0 text-[9px]"
            >
              {alertCount > 99 ? "99+" : alertCount}
            </Badge>
          )}
          <span className="sr-only">
            알림 {alertCount > 0 ? `(${alertCount}건)` : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">재고 알림</h4>
            {alertCount > 0 && (
              <Badge variant="secondary" className="text-[11px]">
                {alertCount}건
              </Badge>
            )}
          </div>
        </div>

        {isLoading && !hasFetched ? (
          <div className="p-3">
            <AlertSkeleton />
          </div>
        ) : alertCount === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <Bell className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              재고 알림이 없습니다
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="divide-y">
              {displayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <AlertIcon type={alert.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">
                        {alert.productName}
                      </p>
                      <AlertTypeBadge type={alert.type} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      현재 {alert.currentQuantity}개 / 최소{" "}
                      {alert.minQuantity}개
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {alertCount > 0 && (
          <div className="border-t px-4 py-2.5">
            <Link
              href="/inventory"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              재고 페이지에서 모두 보기
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
