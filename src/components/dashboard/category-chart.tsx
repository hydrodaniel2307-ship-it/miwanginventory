"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategoryChartItem } from "@/app/(protected)/dashboard/actions";
import { Package } from "lucide-react";

const chartConfig = {
  count: {
    label: "재고 수량",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface CategoryChartProps {
  data: CategoryChartItem[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const isEmpty = data.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">카테고리별 재고</CardTitle>
        <CardDescription className="text-[13px]">
          카테고리별 현재 재고 수량
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
              <Package className="size-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium">데이터가 없습니다</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              재고가 등록되면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ left: -8, right: 8 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
              <XAxis
                dataKey="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
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
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
