"use server";

import {
  predictDemand,
  predictAllProducts,
  type ProductPrediction,
} from "@/lib/prediction";

/**
 * Returns prediction data for all products with inventory records.
 */
export async function getProductPredictions(): Promise<ProductPrediction[]> {
  return predictAllProducts();
}

/**
 * Returns prediction data for a single product by ID.
 */
export async function getProductPrediction(
  productId: string
): Promise<ProductPrediction | null> {
  return predictDemand(productId);
}

export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  daysUntilStockout: number;
  predictedMonthlyDemand: number;
  action: ProductPrediction["action"];
}

/**
 * Returns products predicted to run out of stock within the given number of days.
 * Default threshold is 30 days.
 */
export async function getStockAlerts(
  thresholdDays: number = 30
): Promise<StockAlert[]> {
  const predictions = await predictAllProducts();

  return predictions
    .filter(
      (p) =>
        p.daysUntilStockout !== null && p.daysUntilStockout <= thresholdDays
    )
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      currentStock: p.currentStock,
      daysUntilStockout: p.daysUntilStockout!,
      predictedMonthlyDemand: p.predictions[0]?.predicted ?? p.monthlyAvg,
      action: p.action,
    }))
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
}
