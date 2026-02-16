"use client";

import { useState, useMemo } from "react";
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
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { computeWhatIf, type WhatIfBaseData } from "@/lib/ai-insights-advanced";

interface WhatIfSimulatorProps {
  data: WhatIfBaseData;
}

export function WhatIfSimulator({ data }: WhatIfSimulatorProps) {
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [leadTimeMultiplier, setLeadTimeMultiplier] = useState(1.0);

  const results = useMemo(() => {
    return data.products.map((product) => ({
      ...product,
      whatIf: computeWhatIf(product, demandMultiplier, leadTimeMultiplier),
    }));
  }, [data.products, demandMultiplier, leadTimeMultiplier]);

  // Summary stats
  const summary = useMemo(() => {
    const currentStockoutRisk = data.products.filter(
      (p) => p.daysUntilStockout !== null && p.daysUntilStockout <= 30
    ).length;

    const newStockoutRisk = results.filter(
      (r) => r.whatIf.daysUntilStockout !== null && r.whatIf.daysUntilStockout <= 30
    ).length;

    const totalSafetyStockDelta = results.reduce(
      (s, r) => s + r.whatIf.safetyStockDelta,
      0
    );

    const additionalInventoryCost = results.reduce(
      (s, r) => s + Math.max(0, r.whatIf.safetyStockDelta) * r.costPrice,
      0
    );

    return {
      currentStockoutRisk,
      newStockoutRisk,
      stockoutDelta: newStockoutRisk - currentStockoutRisk,
      totalSafetyStockDelta,
      additionalInventoryCost,
    };
  }, [results, data.products]);

  if (data.products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What-If 시뮬레이터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <SlidersHorizontal className="size-8 text-muted-foreground mb-3" />
            <p className="text-[13px] font-medium">시뮬레이션 데이터가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isChanged = demandMultiplier !== 1.0 || leadTimeMultiplier !== 1.0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="size-4 text-primary" />
          What-If 시나리오 시뮬레이터
        </CardTitle>
        <CardDescription className="text-[13px]">
          수요/리드타임 변동 시 재고 영향을 실시간 시뮬레이션
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sliders */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium">수요 변동</label>
              <Badge variant={demandMultiplier > 1 ? "destructive" : demandMultiplier < 1 ? "default" : "secondary"} className="text-[11px] tabular-nums">
                {demandMultiplier > 1 ? "+" : ""}{((demandMultiplier - 1) * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[demandMultiplier * 100]}
              min={50}
              max={200}
              step={5}
              onValueChange={([v]) => setDemandMultiplier(v / 100)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-50%</span>
              <span>기본</span>
              <span>+100%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium">리드타임 변동</label>
              <Badge variant={leadTimeMultiplier > 1 ? "destructive" : leadTimeMultiplier < 1 ? "default" : "secondary"} className="text-[11px] tabular-nums">
                {leadTimeMultiplier > 1 ? "+" : ""}{((leadTimeMultiplier - 1) * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[leadTimeMultiplier * 100]}
              min={50}
              max={300}
              step={10}
              onValueChange={([v]) => setLeadTimeMultiplier(v / 100)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-50%</span>
              <span>기본</span>
              <span>+200%</span>
            </div>
          </div>
        </div>

        {/* Impact Summary */}
        {isChanged && (
          <div className="grid gap-3 sm:grid-cols-3">
            <ImpactCard
              label="품절 위험 상품"
              current={summary.currentStockoutRisk}
              delta={summary.stockoutDelta}
              suffix="개"
            />
            <ImpactCard
              label="안전재고 변동"
              current={0}
              delta={summary.totalSafetyStockDelta}
              suffix="개"
              showCurrent={false}
            />
            <ImpactCard
              label="추가 재고 비용"
              current={0}
              delta={summary.additionalInventoryCost}
              suffix=""
              showCurrent={false}
              formatFn={(v) => `₩${Math.abs(v).toLocaleString()}`}
            />
          </div>
        )}

        {/* Results Table */}
        <div className="max-h-[350px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[12px]">상품</TableHead>
                <TableHead className="text-[12px] text-right">현재고</TableHead>
                <TableHead className="text-[12px] text-right">안전재고</TableHead>
                <TableHead className="text-[12px] text-right">발주점</TableHead>
                <TableHead className="text-[12px] text-right">품절 예상</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.slice(0, 20).map((r) => (
                <TableRow key={r.productId}>
                  <TableCell className="text-[12px]">
                    <div className="font-medium max-w-[100px] truncate">{r.productName}</div>
                    <div className="text-[11px] text-muted-foreground">{r.sku}</div>
                  </TableCell>
                  <TableCell className="text-[12px] text-right tabular-nums">
                    {r.currentStock}
                  </TableCell>
                  <TableCell className="text-[12px] text-right">
                    <span className="tabular-nums">{r.whatIf.safetyStock}</span>
                    {isChanged && (
                      <DeltaIndicator value={r.whatIf.safetyStockDelta} />
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-right">
                    <span className="tabular-nums">{r.whatIf.reorderPoint}</span>
                    {isChanged && (
                      <DeltaIndicator value={r.whatIf.reorderPointDelta} />
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-right">
                    <span className={`tabular-nums ${
                      r.whatIf.daysUntilStockout !== null && r.whatIf.daysUntilStockout <= 30
                        ? "text-destructive font-medium"
                        : ""
                    }`}>
                      {r.whatIf.daysUntilStockout !== null
                        ? `${r.whatIf.daysUntilStockout}일`
                        : "-"}
                    </span>
                    {isChanged && r.whatIf.stockoutDelta !== null && (
                      <DeltaIndicator value={r.whatIf.stockoutDelta} invert />
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

function DeltaIndicator({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return null;

  // For stockout days, positive delta is good (more days = safer)
  // For safety stock / reorder point, we just show the direction
  const isPositive = invert ? value > 0 : value < 0;
  const isNegative = invert ? value < 0 : value > 0;

  return (
    <span className={`ml-1 inline-flex items-center text-[10px] ${
      isPositive ? "text-emerald-600 dark:text-emerald-400" :
      isNegative ? "text-destructive" :
      "text-muted-foreground"
    }`}>
      {value > 0 ? (
        <TrendingUp className="size-2.5 mr-0.5" />
      ) : value < 0 ? (
        <TrendingDown className="size-2.5 mr-0.5" />
      ) : (
        <Minus className="size-2.5 mr-0.5" />
      )}
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}

function ImpactCard({
  label,
  current,
  delta,
  suffix,
  showCurrent = true,
  formatFn,
}: {
  label: string;
  current: number;
  delta: number;
  suffix: string;
  showCurrent?: boolean;
  formatFn?: (v: number) => string;
}) {
  const display = formatFn ? formatFn(delta) : `${delta > 0 ? "+" : ""}${delta}${suffix}`;

  return (
    <div className={`rounded-lg border p-3 ${
      delta > 0 ? "bg-destructive/5 border-destructive/20" :
      delta < 0 ? "bg-emerald-500/5 border-emerald-500/20" :
      ""
    }`}>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        {showCurrent && (
          <span className="text-[13px] font-medium">{current}{suffix}</span>
        )}
        <span className={`text-[15px] font-bold tabular-nums ${
          delta > 0 ? "text-destructive" :
          delta < 0 ? "text-emerald-600 dark:text-emerald-400" :
          ""
        }`}>
          {display}
        </span>
      </div>
    </div>
  );
}
