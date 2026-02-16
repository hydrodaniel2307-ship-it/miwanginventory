"use client";

import { Package, AlertTriangle, ShoppingCart, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/app/(protected)/dashboard/actions";

interface KpiCardsProps {
  stats: DashboardStats;
}

const kpiConfig = [
  {
    key: "totalProducts" as const,
    label: "전체 상품",
    icon: Package,
    suffix: "개",
    desc: "등록된 상품 수",
    format: (v: number) => v.toLocaleString(),
    accent: "bg-primary/8 text-primary dark:bg-primary/15",
  },
  {
    key: "lowStockCount" as const,
    label: "재고 부족",
    icon: AlertTriangle,
    suffix: "건",
    desc: "최소 수량 미만",
    format: (v: number) => v.toLocaleString(),
    accent: "bg-destructive/8 text-destructive dark:bg-destructive/15",
  },
  {
    key: "todayTransactions" as const,
    label: "오늘 입출고",
    icon: ShoppingCart,
    suffix: "건",
    desc: "오늘 처리 건수",
    format: (v: number) => v.toLocaleString(),
    accent:
      "bg-blue-500/8 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  },
  {
    key: "totalInventoryValue" as const,
    label: "총 재고 가치",
    icon: Wallet,
    desc: "원가 기준 합산",
    format: (v: string) => v,
    accent:
      "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
];

export function KpiCards({ stats }: KpiCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {kpiConfig.map((kpi, i) => {
        const Icon = kpi.icon;
        const isValueCard = kpi.key === "totalInventoryValue";
        const rawValue = stats[kpi.key];
        const value = isValueCard
          ? kpi.format(rawValue as string)
          : kpi.format(rawValue as number);
        const suffix = isValueCard ? "" : kpi.suffix;

        return (
          <Card
            key={kpi.key}
            className={`group gap-0 py-0 card-hover animate-fade-in-up stagger-${i + 1}`}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                  {kpi.label}
                </span>
                <div
                  className={`flex size-9 items-center justify-center rounded-xl ${kpi.accent} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="size-[18px]" strokeWidth={1.8} />
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-[28px] sm:text-3xl font-bold tracking-tight leading-none">
                  {value}
                </span>
                {suffix && (
                  <span className="text-[13px] font-medium text-muted-foreground ml-0.5">
                    {suffix}
                  </span>
                )}
              </div>

              <p className="mt-2 text-[12px] text-muted-foreground/70">
                {kpi.desc}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
