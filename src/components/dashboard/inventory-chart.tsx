"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { InventoryChartItem } from "@/app/(protected)/dashboard/actions";
import { TrendingUp } from "lucide-react";

const chartConfig = {
  inbound: {
    label: "입고",
    color: "var(--chart-1)",
  },
  outbound: {
    label: "출고",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface InventoryChartProps {
  data: InventoryChartItem[];
}

export function InventoryChart({ data }: InventoryChartProps) {
  const isEmpty =
    data.length === 0 ||
    data.every((d) => d.inbound === 0 && d.outbound === 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">입출고 추이</CardTitle>
        <CardDescription className="text-[13px]">
          최근 6개월 입출고 현황
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
              <TrendingUp className="size-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium">데이터가 없습니다</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              입출고 내역이 등록되면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ left: -8, right: 8, top: 4 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                fontWeight={500}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={40}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <defs>
                <linearGradient id="fillInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-inbound)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-inbound)"
                    stopOpacity={0.01}
                  />
                </linearGradient>
                <linearGradient id="fillOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-outbound)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-outbound)"
                    stopOpacity={0.01}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="outbound"
                type="monotone"
                fill="url(#fillOutbound)"
                stroke="var(--color-outbound)"
                strokeWidth={2}
              />
              <Area
                dataKey="inbound"
                type="monotone"
                fill="url(#fillInbound)"
                stroke="var(--color-inbound)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
