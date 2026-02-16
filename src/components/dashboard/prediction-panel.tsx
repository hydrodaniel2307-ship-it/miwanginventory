"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  PackageCheck,
  ShieldAlert,
  ArrowUpDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductPrediction } from "@/lib/prediction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictionPanelProps {
  predictions: ProductPrediction[];
}

type SortField = "urgency" | "stock" | "demand" | "stockout";
type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TrendIcon({ trend }: { trend: ProductPrediction["trend"] }) {
  switch (trend) {
    case "increasing":
      return <TrendingUp className="size-4 text-red-500" />;
    case "decreasing":
      return <TrendingDown className="size-4 text-emerald-500" />;
    case "stable":
      return <Minus className="size-4 text-muted-foreground" />;
  }
}

function trendLabel(trend: ProductPrediction["trend"]): string {
  switch (trend) {
    case "increasing":
      return "증가";
    case "decreasing":
      return "감소";
    case "stable":
      return "안정";
  }
}

function ActionBadge({ action }: { action: ProductPrediction["action"] }) {
  switch (action) {
    case "재주문 필요":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-0 text-[11px]">
          재주문 필요
        </Badge>
      );
    case "주의":
      return (
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-0 text-[11px]">
          주의
        </Badge>
      );
    case "충분":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-0 text-[11px]">
          충분
        </Badge>
      );
  }
}

/** Micro sparkline showing current stock vs next 3 months predicted demand */
function DemandSparkline({
  predictions,
  currentStock,
}: {
  predictions: ProductPrediction["predictions"];
  currentStock: number;
}) {
  const maxVal = Math.max(
    currentStock,
    ...predictions.map((p) => p.predicted),
    1
  );

  return (
    <div className="flex items-end gap-px h-6 w-16" aria-hidden="true">
      {/* Current stock bar */}
      <div
        className="w-3 bg-blue-400 dark:bg-blue-500 rounded-sm"
        style={{ height: `${Math.max(2, (currentStock / maxVal) * 24)}px` }}
        title={`현재: ${currentStock}`}
      />
      {/* Predicted demand bars */}
      {predictions.map((p, i) => {
        const ratio = p.predicted / maxVal;
        const isHigh = p.predicted > currentStock * 0.3;
        return (
          <div
            key={i}
            className={`w-3 rounded-sm ${
              isHigh
                ? "bg-red-400 dark:bg-red-500"
                : "bg-emerald-400 dark:bg-emerald-500"
            }`}
            style={{ height: `${Math.max(2, ratio * 24)}px` }}
            title={`${p.month}: ${p.predicted}`}
          />
        );
      })}
    </div>
  );
}

function StockoutDisplay({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="text-muted-foreground text-[12px]">--</span>;
  }
  if (days <= 14) {
    return (
      <span className="font-semibold text-red-600 dark:text-red-400 text-[13px]">
        {days}일
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="font-medium text-orange-600 dark:text-orange-400 text-[13px]">
        {days}일
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-[13px]">{days}일</span>
  );
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

function SummaryCards({ predictions }: { predictions: ProductPrediction[] }) {
  const avgConfidence =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((s, p) => s + p.confidence, 0) /
            predictions.length
        )
      : 0;

  const reorderCount = predictions.filter(
    (p) => p.action === "재주문 필요"
  ).length;

  const stockoutRisk = predictions.filter(
    (p) => p.daysUntilStockout !== null && p.daysUntilStockout <= 30
  ).length;

  const cards = [
    {
      label: "예측 정확도",
      value: `${avgConfidence}%`,
      icon: Sparkles,
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      desc: "데이터 기반 신뢰도",
    },
    {
      label: "재주문 필요",
      value: `${reorderCount}건`,
      icon: PackageCheck,
      iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      desc: "즉시 발주 권장",
    },
    {
      label: "품절 위험",
      value: `${stockoutRisk}건`,
      icon: ShieldAlert,
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      desc: "30일 이내 품절 예상",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold leading-tight">{card.value}</p>
              <p className="text-[11px] text-muted-foreground">{card.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert Section
// ---------------------------------------------------------------------------

function AlertSection({ predictions }: { predictions: ProductPrediction[] }) {
  const alerts = predictions.filter(
    (p) => p.daysUntilStockout !== null && p.daysUntilStockout <= 30
  );

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
        <h4 className="text-[13px] font-semibold text-red-700 dark:text-red-400">
          품절 위험 알림
        </h4>
        <Badge className="bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300 border-0 text-[11px]">
          {alerts.length}건
        </Badge>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.productId}
            className="flex items-center justify-between gap-2 rounded-md bg-white/60 dark:bg-white/5 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">
                {alert.productName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                현재 {alert.currentStock}개 / 월 예상 수요{" "}
                {alert.predictions[0]?.predicted ?? alert.monthlyAvg}개
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-bold text-red-600 dark:text-red-400">
                {alert.daysUntilStockout}일 후 품절
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable column header button
// ---------------------------------------------------------------------------

function SortButton({
  label,
  field,
  currentField,
  onClick,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  onClick: (field: SortField) => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        currentField === field ? "text-foreground" : ""
      }`}
      onClick={() => onClick(field)}
    >
      {label}
      <ArrowUpDown className="size-3" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PredictionPanel({ predictions }: PredictionPanelProps) {
  const [sortField, setSortField] = useState<SortField>("urgency");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedPredictions = useMemo(() => {
    const actionPriority: Record<ProductPrediction["action"], number> = {
      "재주문 필요": 0,
      "주의": 1,
      "충분": 2,
    };

    const copy = [...predictions];
    const dir = sortDir === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      switch (sortField) {
        case "urgency": {
          const pa = actionPriority[a.action];
          const pb = actionPriority[b.action];
          if (pa !== pb) return (pa - pb) * dir;
          const da = a.daysUntilStockout ?? Infinity;
          const db = b.daysUntilStockout ?? Infinity;
          return (da - db) * dir;
        }
        case "stock":
          return (a.currentStock - b.currentStock) * dir;
        case "demand":
          return (a.monthlyAvg - b.monthlyAvg) * dir;
        case "stockout": {
          const da = a.daysUntilStockout ?? Infinity;
          const db = b.daysUntilStockout ?? Infinity;
          return (da - db) * dir;
        }
        default:
          return 0;
      }
    });

    return copy;
  }, [predictions, sortField, sortDir]);

  const isEmpty = predictions.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
            <Brain className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-1.5">
              AI 수요 예측
              <Sparkles className="size-3.5 text-violet-500" />
            </CardTitle>
            <CardDescription className="text-[12px]">
              과거 주문 데이터 기반 수요 예측 및 재고 분석
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
              <Brain className="size-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium">예측 데이터가 없습니다</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              재고가 등록된 상품이 있으면 AI 수요 예측이 표시됩니다
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <SummaryCards predictions={predictions} />

            {/* Alert Section */}
            <AlertSection predictions={predictions} />

            {/* Prediction Table */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">상품</TableHead>
                    <TableHead className="text-[12px]">
                      <SortButton
                        label="현재 재고"
                        field="stock"
                        currentField={sortField}
                        onClick={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-[12px]">
                      <SortButton
                        label="월 평균 수요"
                        field="demand"
                        currentField={sortField}
                        onClick={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-[12px]">추세</TableHead>
                    <TableHead className="text-[12px] hidden sm:table-cell">
                      예측 차트
                    </TableHead>
                    <TableHead className="text-[12px]">
                      <SortButton
                        label="품절 예상"
                        field="stockout"
                        currentField={sortField}
                        onClick={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-[12px]">
                      <SortButton
                        label="상태"
                        field="urgency"
                        currentField={sortField}
                        onClick={handleSort}
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPredictions.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium truncate max-w-[140px]">
                            {p.productName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[13px] font-medium ${
                            p.currentStock < p.minQuantity
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }`}
                        >
                          {p.currentStock.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-0.5">
                          / {p.minQuantity.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] font-medium">
                          {p.monthlyAvg.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendIcon trend={p.trend} />
                          <span className="text-[11px] text-muted-foreground">
                            {trendLabel(p.trend)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <DemandSparkline
                          predictions={p.predictions}
                          currentStock={p.currentStock}
                        />
                      </TableCell>
                      <TableCell>
                        <StockoutDisplay days={p.daysUntilStockout} />
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={p.action} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Confidence footnote */}
            <p className="text-[11px] text-muted-foreground text-right">
              예측 신뢰도는 과거 주문 데이터 양과 일관성에 기반합니다
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton for loading state
// ---------------------------------------------------------------------------

export function PredictionPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards skeleton */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <Skeleton className="size-9 rounded-lg shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border p-3 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-10" />
              <Skeleton className="h-6 w-16 hidden sm:block" />
              <Skeleton className="h-3.5 w-10" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
