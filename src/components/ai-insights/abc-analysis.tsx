"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from "recharts";
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
import { BarChart3, List } from "lucide-react";
import type { AbcXyzResult } from "@/lib/ai-insights";

interface AbcAnalysisProps {
  data: AbcXyzResult;
}

const chartConfig = {
  revenue: {
    label: "매출",
    color: "var(--chart-1)",
  },
  cumulative: {
    label: "누적 비율",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const abcColors: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  C: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const xyzColors: Record<string, string> = {
  X: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  Y: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  Z: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export function AbcAnalysis({ data }: AbcAnalysisProps) {
  if (data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ABC/XYZ 분류</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data — top 15 products
  const chartData = data.items.slice(0, 15).map((item) => ({
    name: item.productName.length > 8
      ? item.productName.substring(0, 8) + "…"
      : item.productName,
    revenue: Math.round(item.totalRevenue),
    cumulative: Math.round(item.cumulativeShare * 100),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">ABC/XYZ 분류</CardTitle>
            <CardDescription className="text-[13px]">
              매출 기여도(ABC) + 수요 안정성(XYZ) 분석
            </CardDescription>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span>A: {data.summary.A}</span>
            <span>B: {data.summary.B}</span>
            <span>C: {data.summary.C}</span>
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
            <TabsTrigger value="table" className="gap-1.5">
              <List className="size-3.5" />
              상세
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ComposedChart
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
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  width={60}
                  tickFormatter={(v: number) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}K`
                        : String(v)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  width={40}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Line
                  yAxisId="right"
                  dataKey="cumulative"
                  stroke="var(--color-cumulative)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="table">
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">상품</TableHead>
                    <TableHead className="text-[12px]">SKU</TableHead>
                    <TableHead className="text-[12px] text-center">
                      ABC
                    </TableHead>
                    <TableHead className="text-[12px] text-center">
                      XYZ
                    </TableHead>
                    <TableHead className="text-[12px] text-right">
                      매출
                    </TableHead>
                    <TableHead className="text-[12px] text-right">
                      비율
                    </TableHead>
                    <TableHead className="text-[12px]">권장사항</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="text-[12px] font-medium max-w-[120px] truncate">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {item.sku}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${abcColors[item.abcClass]}`}
                        >
                          {item.abcClass}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${xyzColors[item.xyzClass]}`}
                        >
                          {item.xyzClass}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] text-right">
                        ₩{Math.round(item.totalRevenue).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[12px] text-right">
                        {(item.revenueShare * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground max-w-[160px]">
                        {item.recommendation}
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
        <BarChart3 className="size-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium">분석 데이터가 없습니다</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        주문 내역이 쌓이면 ABC/XYZ 분류가 표시됩니다
      </p>
    </div>
  );
}
