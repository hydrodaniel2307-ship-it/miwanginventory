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
import { Truck, Award } from "lucide-react";
import type { SupplierPerformanceResult } from "@/lib/ai-insights-advanced";

interface SupplierPerformanceProps {
  data: SupplierPerformanceResult;
}

const gradeConfig: Record<string, { badgeVariant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  A: { badgeVariant: "default", color: "text-emerald-600 dark:text-emerald-400" },
  B: { badgeVariant: "default", color: "text-blue-600 dark:text-blue-400" },
  C: { badgeVariant: "secondary", color: "text-yellow-600 dark:text-yellow-400" },
  D: { badgeVariant: "outline", color: "text-orange-600 dark:text-orange-400" },
  F: { badgeVariant: "destructive", color: "text-destructive" },
};

export function SupplierPerformance({ data }: SupplierPerformanceProps) {
  if (data.suppliers.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">공급업체 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Truck className="size-8 text-muted-foreground mb-3" />
            <p className="text-[13px] font-medium">공급업체 데이터가 없습니다</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              발주에 공급업체를 연결하면 성과 분석이 표시됩니다
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
              <Truck className="size-4 text-primary" />
              공급업체 성과 분석
            </CardTitle>
            <CardDescription className="text-[13px]">
              납기 준수율, 리드타임, 가격 안정성 기반 종합 평가
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[11px]">
            평균 점수 {data.avgScore}점
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Supplier Highlight */}
        {data.suppliers.length > 0 && (
          <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 flex items-center gap-3">
            <Award className="size-5 text-primary shrink-0" />
            <div className="text-[12px]">
              <span className="font-medium">최우수 공급업체: </span>
              <span className="text-primary font-semibold">{data.suppliers[0].supplierName}</span>
              <span className="text-muted-foreground ml-1">
                (점수 {data.suppliers[0].overallScore}점, 등급 {data.suppliers[0].grade})
              </span>
            </div>
          </div>
        )}

        {/* Supplier Table */}
        <div className="max-h-[350px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[12px]">공급업체</TableHead>
                <TableHead className="text-[12px] text-center">등급</TableHead>
                <TableHead className="text-[12px] text-right">점수</TableHead>
                <TableHead className="text-[12px] text-right">주문수</TableHead>
                <TableHead className="text-[12px] text-right">평균 리드타임</TableHead>
                <TableHead className="text-[12px] text-right">납기 준수율</TableHead>
                <TableHead className="text-[12px] text-right">가격 안정성</TableHead>
                <TableHead className="text-[12px]">권장사항</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.suppliers.map((supplier) => {
                const config = gradeConfig[supplier.grade] ?? gradeConfig.C;
                return (
                  <TableRow key={supplier.supplierId}>
                    <TableCell className="text-[12px] font-medium max-w-[100px] truncate">
                      {supplier.supplierName}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.badgeVariant} className="text-[11px]">
                        {supplier.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-[12px] text-right tabular-nums font-bold ${config.color}`}>
                      {supplier.overallScore}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums">
                      {supplier.totalOrders}
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums">
                      {supplier.avgLeadTimeDays > 0 ? `${supplier.avgLeadTimeDays}일` : "-"}
                    </TableCell>
                    <TableCell className="text-[12px] text-right">
                      <Badge
                        variant={supplier.onTimeRate >= 0.9 ? "default" : supplier.onTimeRate >= 0.7 ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {(supplier.onTimeRate * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-right tabular-nums">
                      {(supplier.priceStability * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground max-w-[140px]">
                      {supplier.recommendation}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Score Breakdown Legend */}
        <div className="rounded-lg border p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground mb-1">점수 산정 기준</p>
          <div className="grid grid-cols-2 gap-1">
            <span>납기 준수율: 40%</span>
            <span>리드타임 일관성: 25%</span>
            <span>가격 안정성: 20%</span>
            <span>주문 이행률: 15%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
