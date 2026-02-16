import { createClient } from "@/lib/supabase/admin";

export type StockAlert = {
  id: string;
  type: "out_of_stock" | "low_stock" | "critical";
  productId: string;
  productName: string;
  productSku: string;
  currentQuantity: number;
  minQuantity: number;
  severity: "high" | "medium" | "low";
  message: string;
  createdAt: string;
};

export type ReorderSuggestion = {
  productId: string;
  productName: string;
  productSku: string;
  currentQuantity: number;
  minQuantity: number;
  suggestedQuantity: number;
  costPrice: number;
  estimatedCost: number;
};

/**
 * Checks inventory for stock alerts.
 * - quantity === 0 -> out_of_stock / high severity
 * - quantity < min_quantity * 0.5 -> critical / high severity
 * - quantity <= min_quantity -> low_stock / medium severity
 */
export async function checkStockAlerts(): Promise<StockAlert[]> {
  const supabase = createClient();

  // Supabase doesn't support column-to-column comparison in filters,
  // so we fetch all rows and filter in application code.
  const { data: allData, error: fetchError } = await supabase
    .from("inventory")
    .select("id, quantity, min_quantity, products(id, name, sku)")
    .order("quantity", { ascending: true });

  if (fetchError || !allData) {
    console.error("Failed to fetch stock alerts:", fetchError?.message);
    return [];
  }

  const alerts: StockAlert[] = [];
  const now = new Date().toISOString();

  for (const row of allData) {
    if (row.quantity > row.min_quantity) continue;

    const product = row.products as unknown as {
      id: string;
      name: string;
      sku: string;
    };

    if (!product) continue;

    let type: StockAlert["type"];
    let severity: StockAlert["severity"];
    let message: string;

    if (row.quantity <= 0) {
      type = "out_of_stock";
      severity = "high";
      message = `${product.name} 재고가 소진되었습니다`;
    } else if (row.quantity < row.min_quantity * 0.5) {
      type = "critical";
      severity = "high";
      message = `${product.name} 재고가 매우 부족합니다 (${row.quantity}/${row.min_quantity})`;
    } else {
      type = "low_stock";
      severity = "medium";
      message = `${product.name} 재고가 부족합니다 (${row.quantity}/${row.min_quantity})`;
    }

    alerts.push({
      id: `alert-${row.id}`,
      type,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      currentQuantity: row.quantity,
      minQuantity: row.min_quantity,
      severity,
      message,
      createdAt: now,
    });
  }

  // Sort by severity: high first, then medium
  const severityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

/**
 * Generates reorder suggestions for low-stock items.
 * Suggested quantity = (min_quantity * 2) - current quantity
 * Estimated cost = suggested quantity * cost_price
 */
export async function generateReorderSuggestions(): Promise<
  ReorderSuggestion[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory")
    .select(
      "id, quantity, min_quantity, products(id, name, sku, cost_price)"
    )
    .order("quantity", { ascending: true });

  if (error || !data) {
    console.error("Failed to generate reorder suggestions:", error?.message);
    return [];
  }

  const suggestions: ReorderSuggestion[] = [];

  for (const row of data) {
    if (row.quantity > row.min_quantity) continue;

    const product = row.products as unknown as {
      id: string;
      name: string;
      sku: string;
      cost_price: number;
    };

    if (!product) continue;

    const suggestedQuantity = Math.max(
      1,
      row.min_quantity * 2 - row.quantity
    );
    const estimatedCost = suggestedQuantity * product.cost_price;

    suggestions.push({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      currentQuantity: row.quantity,
      minQuantity: row.min_quantity,
      suggestedQuantity,
      costPrice: product.cost_price,
      estimatedCost,
    });
  }

  return suggestions;
}
