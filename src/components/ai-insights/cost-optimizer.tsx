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
import { Lightbulb, PackageX, BarChart3 } from "lucide-react";
import type { CostOptimizationResult } from "@/lib/ai-insights";

interface CostOptimizerProps {
  data: CostOptimizationResult;
}

const priorityConfig = {
  high: {
    label: "높음",
    variant: "destructive" as const,
  },
  medium: {
    label: "보통",
    variant: "secondary" as const,
  },
  low: {
    label: "낮음",
    variant: "outline" as const,
  },
};

export function CostOptimizer({ data }: CostOptimizerProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">비용 최적화</CardTitle>
        <CardDescription className="text-[13px]">
          사장재고, 과잉재고, 마진 분석
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recommendations">
          <TabsList className="mb-4">
            <TabsTrigger value="recommendations" className="gap-1.5">
              <Lightbulb className="size-3.5" />
              권장사항
            </TabsTrigger>
            <TabsTrigger value="deadstock" className="gap-1.5">
              <PackageX className="size-3.5" />
              사장재고
            </TabsTrigger>
            <TabsTrigger value="margin" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              마진분석
            </TabsTrigger>
          </TabsList>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="space-y-3">
            {data.recommendations.length === 0 ? (
              <EmptyState message="현재 비용 최적화 권장사항이 없습니다" />
            ) : (
              <>
                {data.totalPotentialSavings > 0 && (
                  <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3 text-[12px]">
                    <span className="font-medium">
                      총 절감 가능액:{" "}
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ₩{data.totalPotentialSavings.toLocaleString()}
                      </span>
                    </span>
                  </div>
                )}
                {data.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">
                        {rec.title}
                      </span>
                      <Badge variant={priorityConfig[rec.priority].variant} className="text-[10px]">
                        {priorityConfig[rec.priority].label}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {rec.description}
                    </p>
                    {rec.potentialSavings > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        예상 절감: ₩{rec.potentialSavings.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* Dead Stock */}
          <TabsContent value="deadstock">
            {data.deadStock.length === 0 ? (
              <EmptyState message="사장재고 없음 — 모든 상품이 활발히 판매 중입니다" />
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 text-[12px]">
                  <span className="font-medium">
                    사장재고 총 가치:{" "}
                    <span className="text-destructive">
                      ₩{data.totalDeadStockValue.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-muted-foreground ml-1">
                    ({data.deadStock.length}개 상품)
                  </span>
                </div>
                <div className="max-h-[250px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[12px]">상품</TableHead>
                        <TableHead className="text-[12px] text-right">
                          수량
                        </TableHead>
                        <TableHead className="text-[12px] text-right">
                          재고가치
                        </TableHead>
                        <TableHead className="text-[12px] text-right">
                          미판매일
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.deadStock.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="text-[12px]">
                            <div className="font-medium max-w-[100px] truncate">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.sku}
                            </div>
                          </TableCell>
                          <TableCell className="text-[12px] text-right tabular-nums">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-[12px] text-right tabular-nums">
                            ₩{item.value.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-[12px] text-right tabular-nums">
                            {item.daysSinceLastSale === 999
                              ? "판매이력 없음"
                              : `${item.daysSinceLastSale}일`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Margin Analysis */}
          <TabsContent value="margin">
            {data.categoryMargins.length === 0 ? (
              <EmptyState message="마진 분석 데이터가 없습니다" />
            ) : (
              <div className="space-y-3">
                <div className="max-h-[300px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[12px]">카테고리</TableHead>
                        <TableHead className="text-[12px] text-right">
                          상품수
                        </TableHead>
                        <TableHead className="text-[12px] text-right">
                          평균 마진
                        </TableHead>
                        <TableHead className="text-[12px] text-right">
                          총 매출
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.categoryMargins.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell className="text-[12px] font-medium">
                            {cat.category}
                          </TableCell>
                          <TableCell className="text-[12px] text-right tabular-nums">
                            {cat.productCount}
                          </TableCell>
                          <TableCell className="text-[12px] text-right">
                            <Badge
                              variant={
                                cat.avgMargin >= 0.2
                                  ? "default"
                                  : cat.avgMargin >= 0.1
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="text-[10px]"
                            >
                              {(cat.avgMargin * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[12px] text-right tabular-nums">
                            ₩{cat.totalRevenue.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {data.lowMarginProducts.length > 0 && (
                  <div className="rounded-lg border bg-yellow-500/5 border-yellow-500/20 p-3 text-[12px]">
                    <span className="font-medium">
                      저마진 상품 {data.lowMarginProducts.length}개
                    </span>
                    <span className="text-muted-foreground ml-1">
                      (마진 10% 미만)
                    </span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[150px] text-center">
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </div>
  );
}
