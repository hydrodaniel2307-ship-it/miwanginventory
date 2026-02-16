"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Layers, Target, RefreshCw } from "lucide-react";
import type { TurnoverAnalysisResult } from "@/lib/ai-insights";

interface TurnoverChartProps {
  data: TurnoverAnalysisResult;
}

const chartConfig = {
  turnoverRate: {
    label: "회전율",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const classConfig: Record<
  string,
  { label: string; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  fast: { label: "빠름", color: "var(--chart-1)", badgeVariant: "default" },
  normal: { label: "보통", color: "var(--chart-2)", badgeVariant: "secondary" },
  slow: { label: "느림", color: "var(--chart-4)", badgeVariant: "outline" },
  stagnant: { label: "정체", color: "var(--chart-5)", badgeVariant: "destructive" },
};

export function TurnoverChart({ data }: TurnoverChartProps) {
  if (data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">재고 회전율</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  // Chart data — top 15 by turnover
  const chartData = data.items.slice(0, 15).map((item) => ({
    name:
      item.productName.length > 8
        ? item.productName.substring(0, 8) + "…"
        : item.productName,
    turnoverRate: item.turnoverRate,
    turnoverClass: item.turnoverClass,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">재고 회전율</CardTitle>
            <CardDescription className="text-[13px]">
              COGS/평균재고 기반 회전율 분석
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <RefreshCw className="size-3.5" />
            평균 {data.avgTurnoverRate}회/년 · {data.avgSupplyDays}일
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList className="mb-4">
            <TabsTrigger value="chart" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              차트
            </TabsTrigger>
            <TabsTrigger value="category" className="gap-1.5">
              <Layers className="size-3.5" />
              카테고리
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="gap-1.5">
              <Target className="size-3.5" />
              벤치마크
            </TabsTrigger>
          </TabsList>

          {/* Chart */}
          <TabsContent value="chart">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                data={chartData}
                margin={{ left: -8, right: 8, top: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  strokeOpacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={10}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="turnoverRate" radius={[4, 4, 0, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={classConfig[entry.turnoverClass]?.color ?? "var(--chart-1)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </TabsContent>

          {/* Category */}
          <TabsContent value="category">
            <div className="max-h-[300px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">카테고리</TableHead>
                    <TableHead className="text-[12px] text-right">
                      상품수
                    </TableHead>
                    <TableHead className="text-[12px] text-right">
                      평균 회전율
                    </TableHead>
                    <TableHead className="text-[12px] text-right">
                      연간 COGS
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categoryTurnovers.map((cat) => (
                    <TableRow key={cat.category}>
                      <TableCell className="text-[12px] font-medium">
                        {cat.category}
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">
                        {cat.productCount}
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">
                        {cat.avgTurnoverRate}회
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">
                        ₩{cat.totalCogs.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Benchmark */}
          <TabsContent value="benchmark">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                ["fast", "normal", "slow", "stagnant"] as const
              ).map((cls) => {
                const config = classConfig[cls];
                const count = data.benchmarks[cls];
                const total = data.items.length;
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";

                return (
                  <div
                    key={cls}
                    className="rounded-lg border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={config.badgeVariant} className="text-[11px]">
                        {config.label}
                      </Badge>
                      <span className="text-[20px] font-bold tabular-nums">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {benchmarkDescription(cls)} · {pct}%
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border p-3 text-[12px] text-muted-foreground">
              <p className="font-medium text-foreground mb-1">회전율 기준</p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span>빠름: 8회/년 이상 (~45일)</span>
                <span>보통: 4~8회/년 (45~90일)</span>
                <span>느림: 1~4회/년 (90~365일)</span>
                <span>정체: 1회/년 미만 (365일+)</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function benchmarkDescription(cls: string): string {
  switch (cls) {
    case "fast":
      return "연 8회 이상 회전";
    case "normal":
      return "연 4~8회 회전";
    case "slow":
      return "연 1~4회 회전";
    case "stagnant":
      return "연 1회 미만";
    default:
      return "";
  }
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
        <RefreshCw className="size-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium">회전율 데이터가 없습니다</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        판매 데이터가 쌓이면 회전율 분석이 표시됩니다
      </p>
    </div>
  );
}
