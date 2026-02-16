import { createClient } from "@/lib/supabase/admin";

export type ReportType =
  | "inventory_summary"
  | "stock_movement"
  | "valuation"
  | "low_stock";

export type ReportData = {
  title: string;
  generatedAt: string;
  period: string;
  summary: Record<string, string | number>;
  rows: Record<string, string | number>[];
  totals?: Record<string, string | number>;
};

/**
 * Format a date to Korean locale string (YYYY-MM-DD).
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Inventory Summary Report
 * All products with current stock, location, value.
 * Summary: total items, total value, categories count.
 */
export async function generateInventorySummaryReport(): Promise<ReportData> {
  const supabase = createClient();

  // Fetch inventory joined with products and categories
  const { data: inventoryData, error: invError } = await supabase
    .from("inventory")
    .select(
      "id, quantity, min_quantity, location, product_id, products(id, name, sku, unit_price, cost_price, category_id, categories(name))"
    );

  if (invError) {
    throw new Error(`재고 데이터를 불러오는 중 오류가 발생했습니다: ${invError.message}`);
  }

  const rows: Record<string, string | number>[] = [];
  let totalItems = 0;
  let totalValue = 0;
  const categorySet = new Set<string>();

  for (const inv of inventoryData ?? []) {
    const product = inv.products as unknown as Record<string, unknown> | null;
    if (!product) continue;

    const category = product.categories as unknown as Record<string, unknown> | null;
    const categoryName = (category?.name as string) ?? "-";
    const quantity = inv.quantity ?? 0;
    const costPrice = (product.cost_price as number) ?? 0;
    const unitPrice = (product.unit_price as number) ?? 0;
    const value = quantity * costPrice;

    if (categoryName !== "-") {
      categorySet.add(categoryName);
    }

    totalItems += quantity;
    totalValue += value;

    rows.push({
      제품명: (product.name as string) ?? "-",
      SKU: (product.sku as string) ?? "-",
      카테고리: categoryName,
      수량: quantity,
      위치: inv.location ?? "-",
      단가: unitPrice,
      원가: costPrice,
      재고가치: value,
    });
  }

  return {
    title: "재고 현황 보고서",
    generatedAt: new Date().toISOString(),
    period: formatDate(new Date()),
    summary: {
      총수량: totalItems,
      총재고가치: totalValue,
      카테고리수: categorySet.size,
      제품수: rows.length,
    },
    rows,
    totals: {
      총수량: totalItems,
      총재고가치: totalValue,
    },
  };
}

/**
 * Stock Movement Report
 * Inbound/outbound by product for date range.
 * Summary: total inbound, total outbound, net change.
 */
export async function generateStockMovementReport(
  startDate: string,
  endDate: string
): Promise<ReportData> {
  const supabase = createClient();

  // Fetch orders within date range with their items and product info
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, type, status, order_date, order_items(id, product_id, quantity, unit_price, total_price, products(name, sku))"
    )
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .in("status", ["confirmed", "shipped", "delivered"]);

  if (orderError) {
    throw new Error(`주문 데이터를 불러오는 중 오류가 발생했습니다: ${orderError.message}`);
  }

  // Aggregate by product
  const productMap = new Map<
    string,
    {
      name: string;
      sku: string;
      inbound: number;
      outbound: number;
      inboundValue: number;
      outboundValue: number;
    }
  >();

  let totalInbound = 0;
  let totalOutbound = 0;
  let totalInboundValue = 0;
  let totalOutboundValue = 0;

  for (const order of orders ?? []) {
    const items = (order.order_items ?? []) as unknown as Array<Record<string, unknown>>;
    for (const item of items) {
      const product = item.products as unknown as Record<string, unknown> | null;
      const productId = item.product_id as string;
      const quantity = (item.quantity as number) ?? 0;
      const totalPrice = (item.total_price as number) ?? 0;

      const existing = productMap.get(productId) ?? {
        name: (product?.name as string) ?? "-",
        sku: (product?.sku as string) ?? "-",
        inbound: 0,
        outbound: 0,
        inboundValue: 0,
        outboundValue: 0,
      };

      if (order.type === "purchase") {
        existing.inbound += quantity;
        existing.inboundValue += totalPrice;
        totalInbound += quantity;
        totalInboundValue += totalPrice;
      } else if (order.type === "sale") {
        existing.outbound += quantity;
        existing.outboundValue += totalPrice;
        totalOutbound += quantity;
        totalOutboundValue += totalPrice;
      }

      productMap.set(productId, existing);
    }
  }

  const rows: Record<string, string | number>[] = [];
  for (const [, data] of productMap) {
    rows.push({
      제품명: data.name,
      SKU: data.sku,
      입고수량: data.inbound,
      출고수량: data.outbound,
      순변동: data.inbound - data.outbound,
      입고금액: data.inboundValue,
      출고금액: data.outboundValue,
    });
  }

  return {
    title: "입출고 내역 보고서",
    generatedAt: new Date().toISOString(),
    period: `${startDate} ~ ${endDate}`,
    summary: {
      총입고수량: totalInbound,
      총출고수량: totalOutbound,
      순변동: totalInbound - totalOutbound,
      총입고금액: totalInboundValue,
      총출고금액: totalOutboundValue,
    },
    rows,
    totals: {
      총입고수량: totalInbound,
      총출고수량: totalOutbound,
      순변동: totalInbound - totalOutbound,
    },
  };
}

/**
 * Valuation Report
 * Each product: quantity x cost_price = value.
 * Summary: total inventory value, avg value per item.
 */
export async function generateValuationReport(): Promise<ReportData> {
  const supabase = createClient();

  const { data: inventoryData, error: invError } = await supabase
    .from("inventory")
    .select(
      "id, quantity, product_id, products(id, name, sku, cost_price, unit_price, category_id, categories(name))"
    );

  if (invError) {
    throw new Error(`재고 데이터를 불러오는 중 오류가 발생했습니다: ${invError.message}`);
  }

  const rows: Record<string, string | number>[] = [];
  let totalValue = 0;
  let totalRetailValue = 0;
  let totalQuantity = 0;

  for (const inv of inventoryData ?? []) {
    const product = inv.products as unknown as Record<string, unknown> | null;
    if (!product) continue;

    const category = product.categories as unknown as Record<string, unknown> | null;
    const quantity = inv.quantity ?? 0;
    const costPrice = (product.cost_price as number) ?? 0;
    const unitPrice = (product.unit_price as number) ?? 0;
    const costValue = quantity * costPrice;
    const retailValue = quantity * unitPrice;

    totalQuantity += quantity;
    totalValue += costValue;
    totalRetailValue += retailValue;

    rows.push({
      제품명: (product.name as string) ?? "-",
      SKU: (product.sku as string) ?? "-",
      카테고리: (category?.name as string) ?? "-",
      수량: quantity,
      원가: costPrice,
      판매가: unitPrice,
      원가기준가치: costValue,
      판매가기준가치: retailValue,
      마진: retailValue - costValue,
    });
  }

  const avgValuePerItem = totalQuantity > 0 ? Math.round(totalValue / totalQuantity) : 0;

  return {
    title: "재고 가치 보고서",
    generatedAt: new Date().toISOString(),
    period: formatDate(new Date()),
    summary: {
      총원가기준가치: totalValue,
      총판매가기준가치: totalRetailValue,
      총마진: totalRetailValue - totalValue,
      평균단위가치: avgValuePerItem,
      총수량: totalQuantity,
    },
    rows,
    totals: {
      총원가기준가치: totalValue,
      총판매가기준가치: totalRetailValue,
      총마진: totalRetailValue - totalValue,
    },
  };
}

/**
 * Low Stock Report
 * Products below min_quantity threshold.
 * Summary: count of low stock items, estimated reorder cost.
 */
export async function generateLowStockReport(): Promise<ReportData> {
  const supabase = createClient();

  // We need to fetch all inventory and filter client-side since Supabase
  // doesn't easily support column-to-column comparison in filters.
  const { data: inventoryData, error: invError } = await supabase
    .from("inventory")
    .select(
      "id, quantity, min_quantity, location, product_id, products(id, name, sku, cost_price, unit_price, category_id, categories(name))"
    );

  if (invError) {
    throw new Error(`재고 데이터를 불러오는 중 오류가 발생했습니다: ${invError.message}`);
  }

  const rows: Record<string, string | number>[] = [];
  let totalReorderCost = 0;

  for (const inv of inventoryData ?? []) {
    const quantity = inv.quantity ?? 0;
    const minQuantity = inv.min_quantity ?? 0;

    // Only include items below minimum quantity
    if (quantity >= minQuantity) continue;

    const product = inv.products as unknown as Record<string, unknown> | null;
    if (!product) continue;

    const category = product.categories as unknown as Record<string, unknown> | null;
    const costPrice = (product.cost_price as number) ?? 0;
    const deficit = minQuantity - quantity;
    const reorderCost = deficit * costPrice;

    totalReorderCost += reorderCost;

    rows.push({
      제품명: (product.name as string) ?? "-",
      SKU: (product.sku as string) ?? "-",
      카테고리: (category?.name as string) ?? "-",
      현재수량: quantity,
      최소수량: minQuantity,
      부족수량: deficit,
      위치: inv.location ?? "-",
      예상발주비용: reorderCost,
    });
  }

  // Sort by deficit descending (most critical first)
  rows.sort((a, b) => (b.부족수량 as number) - (a.부족수량 as number));

  return {
    title: "재고 부족 보고서",
    generatedAt: new Date().toISOString(),
    period: formatDate(new Date()),
    summary: {
      부족항목수: rows.length,
      예상발주비용: totalReorderCost,
      전체재고항목수: (inventoryData ?? []).length,
      부족비율:
        (inventoryData ?? []).length > 0
          ? `${Math.round((rows.length / (inventoryData ?? []).length) * 100)}%`
          : "0%",
    },
    rows,
    totals: {
      부족항목수: rows.length,
      예상발주비용: totalReorderCost,
    },
  };
}

/**
 * Convert ReportData to CSV string with UTF-8 BOM for Excel Korean support.
 */
export function reportToCsv(report: ReportData): string {
  if (report.rows.length === 0) {
    return "\uFEFF데이터가 없습니다.\n";
  }

  const BOM = "\uFEFF"; // UTF-8 BOM for Korean character support in Excel
  const headers = Object.keys(report.rows[0]);

  const escapeCell = (value: string | number): string => {
    const str = String(value);
    // Escape cells that contain commas, double quotes, or newlines
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows: string[] = [];

  // Title row
  csvRows.push(escapeCell(report.title));
  csvRows.push(`생성일시: ${new Date(report.generatedAt).toLocaleString("ko-KR")}`);
  csvRows.push(`기간: ${report.period}`);
  csvRows.push(""); // Empty line before data

  // Summary section
  csvRows.push("--- 요약 ---");
  for (const [key, value] of Object.entries(report.summary)) {
    csvRows.push(`${escapeCell(key)},${escapeCell(value)}`);
  }
  csvRows.push(""); // Empty line before table

  // Header row
  csvRows.push(headers.map(escapeCell).join(","));

  // Data rows
  for (const row of report.rows) {
    const cells = headers.map((h) => escapeCell(row[h] ?? ""));
    csvRows.push(cells.join(","));
  }

  // Totals row
  if (report.totals) {
    csvRows.push(""); // Empty line
    csvRows.push("--- 합계 ---");
    for (const [key, value] of Object.entries(report.totals)) {
      csvRows.push(`${escapeCell(key)},${escapeCell(value)}`);
    }
  }

  return BOM + csvRows.join("\n");
}

/**
 * Generate a filename for the report CSV export.
 */
export function getReportFilename(type: ReportType): string {
  const dateStr = formatDate(new Date()).replace(/-/g, "");
  const nameMap: Record<ReportType, string> = {
    inventory_summary: "재고현황보고서",
    stock_movement: "입출고내역보고서",
    valuation: "재고가치보고서",
    low_stock: "재고부족보고서",
  };
  return `${nameMap[type]}_${dateStr}.csv`;
}
