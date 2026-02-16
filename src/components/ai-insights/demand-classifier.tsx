"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Sparkles, List, BarChart3 } from "lucide-react";
import type { DemandClassificationResult } from "@/lib/ai-insights-advanced";

interface DemandClassifierProps {
  data: DemandClassificationResult;
}

const chartConfig = {
  count: {
    label: "상품 수",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const patternConfig: Record<
  string,
  { color: string; badgeClass: string; description: string }
> = {
  smooth: {
    color: "var(--chart-1)",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    description: "안정적 수요 — Holt-Winters 예측",
  },
  intermittent: {
    color: "var(--chart-2)",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    description: "간헐적 수요 — Croston 예측법",
  },
  erratic: {
    color: "var(--chart-4)",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    description: "불규칙 수요 — 가중이동평균",
  },
  lumpy: {
    color: "var(--chart-5)",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    description: "돌발적 수요 — Max-Level 정책",
  },
};

const patternLabels: Record<string, string> = {
  smooth: "안정",
  intermittent: "간헐",
  erratic: "불규칙",
  lumpy: "돌발",
};

export function DemandClassifier({ data }: DemandClassifierProps) {
  if (data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">수요 패턴 분류</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Sparkles className="size-8 text-muted-foreground mb-3" />
            <p className="text-[13px] font-medium">분석할 데이터가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summaryChart = [
    { pattern: "안정", count: data.patternSummary.smooth, key: "smooth" },
    { pattern: "간헐", count: data.patternSummary.intermittent, key: "intermittent" },
    { pattern: "불규칙", count: data.patternSummary.erratic, key: "erratic" },
    { pattern: "돌발", count: data.patternSummary.lumpy, key: "lumpy" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              수요 패턴 자동 분류
            </CardTitle>
            <CardDescription className="text-[13px]">
              ADI/CV² 기반 Syntetos-Boylan 프레임워크 — 상품별 최적 예측 알고리즘 자동 적용
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[11px]">
            평균 신뢰도 {data.avgConfidence}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              분포
            </TabsTrigger>
            <TabsTrigger value="detail" className="gap-1.5">
              <List className="size-3.5" />
              상세
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Pattern Distribution Chart */}
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={summaryChart} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis dataKey="pattern" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {summaryChart.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={patternConfig[entry.key]?.color ?? "var(--chart-1)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            {/* Pattern Legend Cards */}
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(patternConfig).map(([key, config]) => (
                <div key={key} className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className={`text-[11px] ${config.badgeClass}`}>
                      {patternLabels[key]}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {config.description}
                    </p>
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {data.patternSummary[key as keyof typeof data.patternSummary]}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="detail">
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">상품</TableHead>
                    <TableHead className="text-[12px] text-center">패턴</TableHead>
                    <TableHead className="text-[12px] text-right">ADI</TableHead>
                    <TableHead className="text-[12px] text-right">CV²</TableHead>
                    <TableHead className="text-[12px]">예측 알고리즘</TableHead>
                    <TableHead className="text-[12px] text-right">다음 달 예측</TableHead>
                    <TableHead className="text-[12px] text-right">신뢰도</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="text-[12px]">
                        <div className="font-medium max-w-[100px] truncate">{item.productName}</div>
                        <div className="text-[11px] text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${patternConfig[item.pattern]?.badgeClass}`}
                        >
                          {item.patternLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">
                        {item.adi}
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">
                        {item.cv2}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground max-w-[140px]">
                        {item.optimalMethod}
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums font-medium">
                        {item.forecast[0]}
                      </TableCell>
                      <TableCell className="text-[12px] text-right">
                        <Badge
                          variant={item.confidence >= 60 ? "default" : item.confidence >= 30 ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {item.confidence}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
