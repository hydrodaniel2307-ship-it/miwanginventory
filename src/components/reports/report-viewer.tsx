"use client";

import { useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, X } from "lucide-react";
import type { ReportData } from "@/lib/reports";

interface ReportViewerProps {
  report: ReportData;
  onClose: () => void;
}

/**
 * Format a value for display: numbers get locale formatting, strings pass through.
 */
function formatDisplayValue(value: string | number): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("ko-KR").format(value);
  }
  return value;
}

/**
 * Determine if a column likely holds numeric/currency data based on the key name.
 */
function isNumericColumn(key: string): boolean {
  const numericKeywords = [
    "수량",
    "가치",
    "금액",
    "비용",
    "원가",
    "판매가",
    "단가",
    "마진",
    "변동",
  ];
  return numericKeywords.some((kw) => key.includes(kw));
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const generatedDate = new Date(report.generatedAt);
  const formattedDate = generatedDate.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const summaryEntries = Object.entries(report.summary);
  const headers = report.rows.length > 0 ? Object.keys(report.rows[0]) : [];

  return (
    <div ref={printRef} className="space-y-6 print:space-y-4">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{report.title}</CardTitle>
              <CardDescription className="mt-1.5 space-x-3">
                <span>생성일시: {formattedDate}</span>
                <span>|</span>
                <span>기간: {report.period}</span>
              </CardDescription>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer />
                인쇄
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {summaryEntries.map(([key, value]) => (
          <Card key={key}>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-xs font-medium">
                {key}
              </p>
              <p className="mt-1 text-lg font-bold">
                {formatDisplayValue(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">상세 데이터</CardTitle>
            <Badge variant="secondary">{report.rows.length}건</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {report.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">
                해당 기간에 데이터가 없습니다.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  {headers.map((header) => (
                    <TableHead
                      key={header}
                      className={
                        isNumericColumn(header) ? "text-right" : undefined
                      }
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground text-center text-xs">
                      {index + 1}
                    </TableCell>
                    {headers.map((header) => (
                      <TableCell
                        key={header}
                        className={
                          isNumericColumn(header) ? "text-right tabular-nums" : undefined
                        }
                      >
                        {formatDisplayValue(row[header] ?? "-")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {report.totals && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">합계</TableCell>
                    {headers.map((header) => (
                      <TableCell
                        key={header}
                        className={`font-semibold ${
                          isNumericColumn(header) ? "text-right tabular-nums" : ""
                        }`}
                      >
                        {report.totals?.[header] !== undefined
                          ? formatDisplayValue(report.totals[header])
                          : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
