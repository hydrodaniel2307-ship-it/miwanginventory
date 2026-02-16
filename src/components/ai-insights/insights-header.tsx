"use client";

import {
  Brain,
  Sparkles,
  Activity,
  TrendingDown,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AllInsightsResult } from "@/app/(protected)/ai-insights/actions";

interface InsightsHeaderProps {
  data: AllInsightsResult;
}

const formatCurrency = (v: number) =>
  `₩${Math.abs(v).toLocaleString("ko-KR")}`;

export function InsightsHeader({ data }: InsightsHeaderProps) {
  const cards = [
    {
      label: "재고 건강도",
      value: `${data.healthScore.score}점`,
      suffix: data.healthScore.grade,
      desc: "종합 재고 상태 점수",
      icon: Activity,
      accent: gradeAccent(data.healthScore.grade),
    },
    {
      label: "이상 탐지",
      value: `${data.anomalyDetection.criticalCount + data.anomalyDetection.warningCount}`,
      suffix: "건",
      desc: `심각 ${data.anomalyDetection.criticalCount} / 경고 ${data.anomalyDetection.warningCount}`,
      icon: Sparkles,
      accent:
        data.anomalyDetection.criticalCount > 0
          ? "bg-destructive/8 text-destructive dark:bg-destructive/15"
          : "bg-yellow-500/8 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400",
    },
    {
      label: "절감 가능액",
      value: formatCurrency(data.costOptimization.totalPotentialSavings),
      suffix: "",
      desc: "비용 최적화 시 예상 절감",
      icon: TrendingDown,
      accent:
        "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    {
      label: "발주 필요",
      value: `${data.smartReorder.reorderNeededCount}`,
      suffix: "건",
      desc: "재주문점 이하 상품",
      icon: ShoppingCart,
      accent:
        data.smartReorder.reorderNeededCount > 0
          ? "bg-blue-500/8 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          : "bg-primary/8 text-primary dark:bg-primary/15",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI 인사이트</h1>
          <p className="text-[13px] text-muted-foreground">
            데이터 기반 재고 분석 및 최적화 제안
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={`group gap-0 py-0 card-hover animate-fade-in-up stagger-${i + 1}`}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                    {card.label}
                  </span>
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl ${card.accent} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[28px] sm:text-3xl font-bold tracking-tight leading-none">
                    {card.value}
                  </span>
                  {card.suffix && (
                    <span className="text-[13px] font-medium text-muted-foreground ml-0.5">
                      {card.suffix}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-muted-foreground/70">
                  {card.desc}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function gradeAccent(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "B":
      return "bg-blue-500/8 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
    case "C":
      return "bg-yellow-500/8 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400";
    case "D":
      return "bg-orange-500/8 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400";
    default:
      return "bg-destructive/8 text-destructive dark:bg-destructive/15";
  }
}
