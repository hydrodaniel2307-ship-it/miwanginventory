import { createClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrendDirection = "increasing" | "decreasing" | "stable";

export interface MonthlyPrediction {
  /** Label like "3월" */
  month: string;
  /** Predicted demand quantity for the month */
  predicted: number;
}

export interface ProductPrediction {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minQuantity: number;
  monthlyAvg: number;
  trend: TrendDirection;
  /** Next 3 months of predicted demand */
  predictions: MonthlyPrediction[];
  /** Recommended quantity at which to reorder */
  reorderPoint: number;
  /** 0-100, higher = more confident (based on data availability) */
  confidence: number;
  /** Estimated days until stock reaches zero at predicted rate, null if no demand */
  daysUntilStockout: number | null;
  /** Urgency action label */
  action: "재주문 필요" | "주의" | "충분";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface MonthlyDemand {
  /** "YYYY-MM" */
  key: string;
  quantity: number;
}

/**
 * Build an array of monthly demand totals from raw order-item rows.
 * Returns entries for each month in the range, including months with 0 demand.
 */
function buildMonthlyDemand(
  rows: { order_date: string; quantity: number }[],
  monthsBack: number
): MonthlyDemand[] {
  const now = new Date();
  const map = new Map<string, number>();

  // Initialize all months to 0
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, 0);
  }

  // Accumulate quantities
  for (const row of rows) {
    const d = new Date(row.order_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + row.quantity);
    }
  }

  // Return sorted array
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, quantity]) => ({ key, quantity }));
}

/**
 * Simple Moving Average over the last `window` entries.
 */
function simpleMovingAverage(data: number[], window: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-window);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

/**
 * Calculate the slope of a simple linear regression (trend direction).
 * Positive slope = increasing, negative = decreasing.
 */
function linearSlope(data: number[]): number {
  const n = data.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Determine trend direction from slope relative to the average magnitude.
 */
function detectTrend(data: number[]): TrendDirection {
  const slope = linearSlope(data);
  const avg = data.length > 0 ? data.reduce((s, v) => s + v, 0) / data.length : 0;
  // Threshold: 5% of average per period is considered significant
  const threshold = avg * 0.05;

  if (slope > threshold) return "increasing";
  if (slope < -threshold) return "decreasing";
  return "stable";
}

/**
 * Predict next N months using SMA + trend adjustment.
 */
function predictNextMonths(
  data: number[],
  count: number
): number[] {
  const sma = simpleMovingAverage(data, 3); // Use last 3 months for SMA
  const slope = linearSlope(data);
  const results: number[] = [];

  for (let i = 1; i <= count; i++) {
    // Project forward: SMA + (slope * periods ahead)
    const predicted = Math.max(0, Math.round(sma + slope * i));
    results.push(predicted);
  }

  return results;
}

/**
 * Calculate confidence score (0-100) based on data availability and variance.
 * More historical data months with actual demand = higher confidence.
 */
function calculateConfidence(monthlyData: number[]): number {
  const totalMonths = monthlyData.length;
  const nonZeroMonths = monthlyData.filter((v) => v > 0).length;

  if (totalMonths === 0 || nonZeroMonths === 0) return 10; // Minimal confidence

  // Base confidence from data coverage (max 60 points)
  const coverageScore = Math.min(60, (nonZeroMonths / 6) * 60);

  // Consistency score from coefficient of variation (max 40 points)
  const avg = monthlyData.reduce((s, v) => s + v, 0) / totalMonths;
  if (avg === 0) return Math.round(coverageScore);

  const variance =
    monthlyData.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / totalMonths;
  const cv = Math.sqrt(variance) / avg; // Coefficient of variation
  // Lower CV = more consistent = higher score
  const consistencyScore = Math.max(0, 40 * (1 - Math.min(cv, 2) / 2));

  return Math.round(coverageScore + consistencyScore);
}

/**
 * Build a month label like "3월" from a Date that is `offset` months ahead of now.
 */
function futureMonthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getMonth() + 1}월`;
}

/**
 * Determine the action label based on days-until-stockout.
 */
function determineAction(
  daysUntilStockout: number | null,
  currentStock: number,
  minQuantity: number
): ProductPrediction["action"] {
  if (currentStock <= 0) return "재주문 필요";
  if (daysUntilStockout !== null && daysUntilStockout <= 30) return "재주문 필요";
  if (daysUntilStockout !== null && daysUntilStockout <= 60) return "주의";
  if (currentStock < minQuantity) return "주의";
  return "충분";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Predict demand for a single product.
 */
export async function predictDemand(
  productId: string
): Promise<ProductPrediction | null> {
  const supabase = createClient();

  // Fetch product + inventory info
  const { data: inventoryRow } = await supabase
    .from("inventory")
    .select("quantity, min_quantity, products(id, name, sku)")
    .eq("product_id", productId)
    .single();

  if (!inventoryRow) return null;

  const product = inventoryRow.products as unknown as {
    id: string;
    name: string;
    sku: string;
  };

  // Fetch last 6 months of sale order items for this product
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];

  const { data: orderData } = await supabase
    .from("order_items")
    .select("quantity, orders!inner(order_date, type)")
    .eq("product_id", productId)
    .eq("orders.type", "sale")
    .gte("orders.order_date", startDate);

  // Flatten into { order_date, quantity } rows
  const rows = (orderData ?? []).map((item) => {
    const order = item.orders as unknown as { order_date: string; type: string };
    return {
      order_date: order.order_date,
      quantity: item.quantity,
    };
  });

  const monthlyDemand = buildMonthlyDemand(rows, 6);
  const demandValues = monthlyDemand.map((m) => m.quantity);

  const monthlyAvg = simpleMovingAverage(demandValues, 6);
  const trend = detectTrend(demandValues);
  const predictedValues = predictNextMonths(demandValues, 3);
  const confidence = calculateConfidence(demandValues);

  const predictions: MonthlyPrediction[] = predictedValues.map((predicted, i) => ({
    month: futureMonthLabel(i + 1),
    predicted,
  }));

  // Reorder point: average daily demand * lead time (assume 14 days) + safety stock
  const avgDailyDemand = monthlyAvg / 30;
  const leadTimeDays = 14;
  const safetyStock = Math.ceil(avgDailyDemand * 7); // 7-day safety buffer
  const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);

  // Days until stockout
  const predictedMonthlyDemand = predictedValues[0] || monthlyAvg;
  const dailyDemand = predictedMonthlyDemand / 30;
  const daysUntilStockout =
    dailyDemand > 0
      ? Math.round(inventoryRow.quantity / dailyDemand)
      : null;

  const action = determineAction(
    daysUntilStockout,
    inventoryRow.quantity,
    inventoryRow.min_quantity
  );

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    currentStock: inventoryRow.quantity,
    minQuantity: inventoryRow.min_quantity,
    monthlyAvg: Math.round(monthlyAvg),
    trend,
    predictions,
    reorderPoint,
    confidence,
    daysUntilStockout,
    action,
  };
}

/**
 * Run predictions for all products that have inventory records.
 * Sorted by urgency: 재주문 필요 first, then 주의, then 충분.
 * Within each group, sorted by daysUntilStockout ascending.
 */
export async function predictAllProducts(): Promise<ProductPrediction[]> {
  const supabase = createClient();

  // Fetch all inventory rows with product info
  const { data: inventoryRows } = await supabase
    .from("inventory")
    .select("product_id, quantity, min_quantity, products(id, name, sku)");

  if (!inventoryRows || inventoryRows.length === 0) return [];

  // Fetch ALL sale order items from the last 6 months in one query
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];

  const { data: allOrderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity, orders!inner(order_date, type)")
    .eq("orders.type", "sale")
    .gte("orders.order_date", startDate);

  // Group order items by product_id
  const orderItemsByProduct = new Map<
    string,
    { order_date: string; quantity: number }[]
  >();

  for (const item of allOrderItems ?? []) {
    const order = item.orders as unknown as {
      order_date: string;
      type: string;
    };
    const pid = item.product_id;
    if (!orderItemsByProduct.has(pid)) {
      orderItemsByProduct.set(pid, []);
    }
    orderItemsByProduct.get(pid)!.push({
      order_date: order.order_date,
      quantity: item.quantity,
    });
  }

  // Build predictions for each product
  const predictions: ProductPrediction[] = [];

  for (const inv of inventoryRows) {
    const product = inv.products as unknown as {
      id: string;
      name: string;
      sku: string;
    };

    if (!product) continue;

    const rows = orderItemsByProduct.get(inv.product_id) ?? [];
    const monthlyDemand = buildMonthlyDemand(rows, 6);
    const demandValues = monthlyDemand.map((m) => m.quantity);

    const monthlyAvg = simpleMovingAverage(demandValues, 6);
    const trend = detectTrend(demandValues);
    const predictedValues = predictNextMonths(demandValues, 3);
    const confidence = calculateConfidence(demandValues);

    const monthlyPredictions: MonthlyPrediction[] = predictedValues.map(
      (predicted, i) => ({
        month: futureMonthLabel(i + 1),
        predicted,
      })
    );

    const avgDailyDemand = monthlyAvg / 30;
    const leadTimeDays = 14;
    const safetyStock = Math.ceil(avgDailyDemand * 7);
    const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);

    const predictedMonthlyDemand = predictedValues[0] || monthlyAvg;
    const dailyDemand = predictedMonthlyDemand / 30;
    const daysUntilStockout =
      dailyDemand > 0 ? Math.round(inv.quantity / dailyDemand) : null;

    const action = determineAction(
      daysUntilStockout,
      inv.quantity,
      inv.min_quantity
    );

    predictions.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      currentStock: inv.quantity,
      minQuantity: inv.min_quantity,
      monthlyAvg: Math.round(monthlyAvg),
      trend,
      predictions: monthlyPredictions,
      reorderPoint,
      confidence,
      daysUntilStockout,
      action,
    });
  }

  // Sort by urgency
  const actionPriority: Record<ProductPrediction["action"], number> = {
    "재주문 필요": 0,
    "주의": 1,
    "충분": 2,
  };

  predictions.sort((a, b) => {
    const priorityDiff = actionPriority[a.action] - actionPriority[b.action];
    if (priorityDiff !== 0) return priorityDiff;
    // Within the same priority, sort by daysUntilStockout ascending (null = last)
    const aDays = a.daysUntilStockout ?? Infinity;
    const bDays = b.daysUntilStockout ?? Infinity;
    return aDays - bDays;
  });

  return predictions;
}
