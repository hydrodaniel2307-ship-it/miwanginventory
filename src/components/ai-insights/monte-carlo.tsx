"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dices, List, BarChart3, AlertTriangle } from "lucide-react";
import type { MonteCarloResult, MonteCarloProduct } from "@/lib/ai-insights-advanced";
import { useState } from "react";

interface MonteCarloProps {
  data: MonteCarloResult;
}

const chartConfig = {
  count: {
    label: "시뮬레이션 횟수",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const riskConfig: Record<string, { label: string; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  critical: { label: "심각", color: "bg-destructive", badgeVariant: "destructive" },
  high: { label: "높음", color: "bg-orange-500", badgeVariant: "destructive" },
  medium: { label: "보통", color: "bg-yellow-500", badgeVariant: "secondary" },
  low: { label: "낮음", color: "bg-emerald-500", badgeVariant: "default" },
};

export function MonteCarlo({ data }: MonteCarloProps) {
  const [selectedProduct, setSelectedProduct] = useState<MonteCarloProduct | null>(
    data.products.length > 0 ? data.products[0] : null
  );

  if (data.products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">몬테카를로 시뮬레이션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Dices className="size-8 text-muted-foreground mb-3" />
            <p className="text-[13px] font-medium">시뮬레이션 데이터가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Dices className="size-4 text-primary" />
              몬테카를로 시뮬레이션
            </CardTitle>
            <CardDescription className="text-[13px]">
              {data.simulationCount}회 시뮬레이션 기반 확률적 품절 리스크 분석
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data.criticalCount > 0 && (
              <Badge variant="destructive" className="text-[11px]">
                심각 {data.criticalCount}
              </Badge>
            )}
            {data.highRiskCount > 0 && (
              <Badge variant="secondary" className="text-[11px]">
                고위험 {data.highRiskCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="risk">
          <TabsList className="mb-4">
            <TabsTrigger value="risk" className="gap-1.5">
              <AlertTriangle className="size-3.5" />
              리스크
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              분포
            </TabsTrigger>
            <TabsTrigger value="detail" className="gap-1.5">
              <List className="size-3.5" />
              상세
            </TabsTrigger>
          </TabsList>

          {/* Risk Overview */}
          <TabsContent value="risk">
            <div className="space-y-4">
              {/* Overall Risk */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium">전체 리스크 점수</span>
                  <span className="text-2xl font-bold tabular-nums">{data.overallRiskScore}</span>
                </div>
                <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      data.overallRiskScore >= 70
                        ? "bg-destructive"
                        : data.overallRiskScore >= 40
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${data.overallRiskScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  30일 내 평균 품절 확률 기반 (0=안전, 100=위험)
                </p>
              </div>

              {/* Top Risk Products */}
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {data.products.slice(0, 10).map((product) => {
                    const prob30 = product.stockoutProbabilities.find(
                      (p) => p.days === 30
                    )?.probability ?? 0;

                    return (
                      <div
                        key={product.productId}
                        className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium truncate">
                              {product.productName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{product.sku}</p>
                          </div>
                          <Badge
                            variant={riskConfig[product.riskLevel].badgeVariant}
                            className="text-[10px] shrink-0"
                          >
                            {riskConfig[product.riskLevel].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span>현재고: {product.currentStock}</span>
                          <span>예상 품절: {product.expectedStockoutDay > 90 ? "90일+" : `${product.expectedStockoutDay}일`}</span>
                          <span>30일 품절확률: {(prob30 * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Distribution Chart */}
          <TabsContent value="distribution">
            {selectedProduct ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium">{selectedProduct.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      품절일 분포 히스토그램 (상품 클릭으로 변경)
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>일평균 수요: {selectedProduct.avgDailyDemand}</p>
                    <p>최적 안전재고: {selectedProduct.optimalSafetyStock}</p>
                  </div>
                </div>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={selectedProduct.histogram} margin={{ left: -8, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      tickFormatter={(v: number) => `${v}일`}
                    />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} barSize={16} />
                  </BarChart>
                </ChartContainer>
                {/* Probability table */}
                <div className="grid grid-cols-5 gap-2">
                  {selectedProduct.stockoutProbabilities.map((sp) => (
                    <div key={sp.days} className="rounded-lg border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground">{sp.days}일</p>
                      <p className={`text-[15px] font-bold tabular-nums ${
                        sp.probability >= 0.7 ? "text-destructive" :
                        sp.probability >= 0.3 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {(sp.probability * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground text-center py-8">
                리스크 탭에서 상품을 선택하세요
              </p>
            )}
          </TabsContent>

          {/* Detail Table */}
          <TabsContent value="detail">
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">상품</TableHead>
                    <TableHead className="text-[12px] text-center">리스크</TableHead>
                    <TableHead className="text-[12px] text-right">현재고</TableHead>
                    <TableHead className="text-[12px] text-right">일수요</TableHead>
                    <TableHead className="text-[12px] text-right">7일</TableHead>
                    <TableHead className="text-[12px] text-right">14일</TableHead>
                    <TableHead className="text-[12px] text-right">30일</TableHead>
                    <TableHead className="text-[12px] text-right">안전재고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((p) => (
                    <TableRow
                      key={p.productId}
                      className="cursor-pointer"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <TableCell className="text-[12px]">
                        <div className="font-medium max-w-[100px] truncate">{p.productName}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={riskConfig[p.riskLevel].badgeVariant} className="text-[10px]">
                          {riskConfig[p.riskLevel].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">{p.currentStock}</TableCell>
                      <TableCell className="text-[12px] text-right tabular-nums">{p.avgDailyDemand}</TableCell>
                      {[7, 14, 30].map((d) => {
                        const prob = p.stockoutProbabilities.find((sp) => sp.days === d)?.probability ?? 0;
                        return (
                          <TableCell key={d} className={`text-[12px] text-right tabular-nums font-medium ${
                            prob >= 0.7 ? "text-destructive" :
                            prob >= 0.3 ? "text-yellow-600 dark:text-yellow-400" : ""
                          }`}>
                            {(prob * 100).toFixed(0)}%
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-[12px] text-right tabular-nums">{p.optimalSafetyStock}</TableCell>
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
