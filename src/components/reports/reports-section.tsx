"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  ArrowLeftRight,
  DollarSign,
  AlertTriangle,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportType, ReportData } from "@/lib/reports";
import { generateReport, exportReportAsCsv } from "@/app/(protected)/settings/report-actions";
import { ReportViewer } from "@/components/reports/report-viewer";

/** Report type card configuration */
interface ReportCardConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  needsDateRange: boolean;
}

const reportCards: ReportCardConfig[] = [
  {
    type: "inventory_summary",
    title: "재고 현황 보고서",
    description: "전체 제품의 현재 재고 수량, 위치, 가치를 확인합니다.",
    icon: <ClipboardList className="size-5 text-blue-600 dark:text-blue-400" />,
    needsDateRange: false,
  },
  {
    type: "stock_movement",
    title: "입출고 내역 보고서",
    description: "기간별 입고 및 출고 내역을 제품별로 분석합니다.",
    icon: <ArrowLeftRight className="size-5 text-green-600 dark:text-green-400" />,
    needsDateRange: true,
  },
  {
    type: "valuation",
    title: "재고 가치 보고서",
    description: "원가 및 판매가 기준 재고 가치와 마진을 분석합니다.",
    icon: <DollarSign className="size-5 text-amber-600 dark:text-amber-400" />,
    needsDateRange: false,
  },
  {
    type: "low_stock",
    title: "재고 부족 보고서",
    description: "최소 수량 이하인 제품과 예상 발주 비용을 확인합니다.",
    icon: <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />,
    needsDateRange: false,
  },
];

/**
 * Get default date range (last 30 days).
 */
function getDefaultDateRange() {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { startDate, endDate };
}

/**
 * Trigger a browser download from a CSV string.
 */
function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportsSection() {
  const [activeReport, setActiveReport] = useState<ReportData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingType, setLoadingType] = useState<ReportType | null>(null);
  const [csvLoadingType, setCsvLoadingType] = useState<ReportType | null>(null);

  // Date range state for stock movement report
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const handleGenerate = useCallback(
    (type: ReportType) => {
      setLoadingType(type);
      startTransition(async () => {
        try {
          const params =
            type === "stock_movement" ? { startDate, endDate } : undefined;
          const report = await generateReport(type, params);
          setActiveReport(report);
          toast.success("보고서가 생성되었습니다.");
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "보고서 생성 중 오류가 발생했습니다.";
          toast.error(message);
        } finally {
          setLoadingType(null);
        }
      });
    },
    [startDate, endDate, startTransition]
  );

  const handleCsvExport = useCallback(
    (type: ReportType) => {
      setCsvLoadingType(type);
      startTransition(async () => {
        try {
          const params =
            type === "stock_movement" ? { startDate, endDate } : undefined;
          const { csv, filename } = await exportReportAsCsv(type, params);
          downloadCsv(csv, filename);
          toast.success("CSV 파일이 다운로드되었습니다.");
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "CSV 내보내기 중 오류가 발생했습니다.";
          toast.error(message);
        } finally {
          setCsvLoadingType(null);
        }
      });
    },
    [startDate, endDate, startTransition]
  );

  const handleCloseViewer = useCallback(() => {
    setActiveReport(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Report Type Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reportCards.map((card) => {
          const isGenerating = loadingType === card.type && isPending;
          const isExporting = csvLoadingType === card.type && isPending;

          return (
            <Card key={card.type} className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    {card.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {/* Date range inputs for stock movement */}
              {card.needsDateRange && (
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-date" className="text-xs">
                        시작일
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end-date" className="text-xs">
                        종료일
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              )}

              <CardFooter className="gap-2">
                <Button
                  size="sm"
                  onClick={() => handleGenerate(card.type)}
                  disabled={isPending}
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <FileText />
                  )}
                  생성
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCsvExport(card.type)}
                  disabled={isPending}
                >
                  {isExporting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  CSV 다운로드
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isPending && loadingType && !activeReport && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Report Viewer */}
      {activeReport && !isPending && (
        <ReportViewer report={activeReport} onClose={handleCloseViewer} />
      )}
    </div>
  );
}
