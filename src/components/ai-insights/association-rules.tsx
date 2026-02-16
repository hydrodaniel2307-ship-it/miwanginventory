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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, ArrowRight, Lightbulb, Link2 } from "lucide-react";
import type { AssociationRulesResult } from "@/lib/ai-insights-advanced";

interface AssociationRulesProps {
  data: AssociationRulesResult;
}

export function AssociationRules({ data }: AssociationRulesProps) {
  if (data.totalOrders < 3 || (data.rules.length === 0 && data.frequentPairs.length === 0)) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">연관 규칙 마이닝</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Network className="size-8 text-muted-foreground mb-3" />
            <p className="text-[13px] font-medium">분석할 주문 데이터가 부족합니다</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              더 많은 주문이 쌓이면 동시 구매 패턴이 분석됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-4 text-primary" />
              연관 규칙 마이닝
            </CardTitle>
            <CardDescription className="text-[13px]">
              Apriori 알고리즘 기반 동시 구매 패턴 분석 ({data.totalOrders}건 주문)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[11px]">
            {data.rules.length}개 규칙
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights">
          <TabsList className="mb-4">
            <TabsTrigger value="insights" className="gap-1.5">
              <Lightbulb className="size-3.5" />
              인사이트
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5">
              <ArrowRight className="size-3.5" />
              규칙
            </TabsTrigger>
            <TabsTrigger value="pairs" className="gap-1.5">
              <Link2 className="size-3.5" />
              빈출 조합
            </TabsTrigger>
          </TabsList>

          {/* Insights */}
          <TabsContent value="insights">
            <div className="space-y-3">
              {data.insights.length > 0 ? (
                data.insights.map((insight, i) => (
                  <div key={i} className="rounded-lg border p-3 flex items-start gap-3">
                    <Lightbulb className="size-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-[12px]">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-muted-foreground text-center py-4">
                  유의미한 인사이트를 찾지 못했습니다
                </p>
              )}

              {/* Top Rules Visual */}
              {data.rules.slice(0, 5).map((rule, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[11px]">
                      {rule.antecedentName}
                    </Badge>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="text-[11px]">
                      {rule.consequentName}
                    </Badge>
                    <div className="ml-auto flex gap-2 text-[11px] text-muted-foreground">
                      <span>신뢰도 {(rule.confidence * 100).toFixed(0)}%</span>
                      <span>Lift {rule.lift}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Rules Table */}
          <TabsContent value="rules">
            <ScrollArea className="h-[350px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px]">조건 상품</TableHead>
                      <TableHead className="text-[12px]" />
                      <TableHead className="text-[12px]">연관 상품</TableHead>
                      <TableHead className="text-[12px] text-right">지지도</TableHead>
                      <TableHead className="text-[12px] text-right">신뢰도</TableHead>
                      <TableHead className="text-[12px] text-right">Lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rules.map((rule, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[12px] font-medium max-w-[120px] truncate">
                          {rule.antecedentName}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="size-3 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="text-[12px] font-medium max-w-[120px] truncate">
                          {rule.consequentName}
                        </TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">
                          {(rule.support * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">
                          <Badge
                            variant={rule.confidence >= 0.5 ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {(rule.confidence * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums font-medium">
                          <span className={rule.lift >= 2 ? "text-emerald-600 dark:text-emerald-400" : ""}>
                            {rule.lift}x
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Frequent Pairs */}
          <TabsContent value="pairs">
            <ScrollArea className="h-[350px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[12px]">상품 A</TableHead>
                      <TableHead className="text-[12px]">상품 B</TableHead>
                      <TableHead className="text-[12px] text-right">동시 구매</TableHead>
                      <TableHead className="text-[12px] text-right">지지도</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.frequentPairs.map((pair, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[12px] font-medium max-w-[120px] truncate">
                          {pair.productAName}
                        </TableCell>
                        <TableCell className="text-[12px] font-medium max-w-[120px] truncate">
                          {pair.productBName}
                        </TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums font-medium">
                          {pair.count}회
                        </TableCell>
                        <TableCell className="text-[12px] text-right tabular-nums">
                          {(pair.support * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
