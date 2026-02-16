"use server";

import {
  type ReportType,
  type ReportData,
  generateInventorySummaryReport,
  generateStockMovementReport,
  generateValuationReport,
  generateLowStockReport,
  reportToCsv,
  getReportFilename,
} from "@/lib/reports";

/**
 * Generate a report of the specified type.
 * Calls the appropriate report engine function and returns ReportData.
 */
export async function generateReport(
  type: ReportType,
  params?: { startDate?: string; endDate?: string }
): Promise<ReportData> {
  switch (type) {
    case "inventory_summary":
      return generateInventorySummaryReport();

    case "stock_movement": {
      // Default to last 30 days if no date range provided
      const endDate =
        params?.endDate ?? new Date().toISOString().slice(0, 10);
      const startDate =
        params?.startDate ??
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      return generateStockMovementReport(startDate, endDate);
    }

    case "valuation":
      return generateValuationReport();

    case "low_stock":
      return generateLowStockReport();

    default:
      throw new Error(`지원하지 않는 보고서 유형입니다: ${type}`);
  }
}

/**
 * Export a report as CSV.
 * Returns the CSV string and suggested filename.
 */
export async function exportReportAsCsv(
  type: ReportType,
  params?: { startDate?: string; endDate?: string }
): Promise<{ csv: string; filename: string }> {
  const report = await generateReport(type, params);
  const csv = reportToCsv(report);
  const filename = getReportFilename(type);

  return { csv, filename };
}
