"use server";

import { createClient } from "@/lib/supabase/admin";
import {
  calculateHealthScore,
  calculateAbcXyzAnalysis,
  calculateSmartReorder,
  detectAnomalies,
  calculateCostOptimization,
  calculateTurnoverAnalysis,
  type ProductInventoryData,
  type OrderHistoryData,
  type HealthScoreResult,
  type AbcXyzResult,
  type SmartReorderResult,
  type AnomalyDetectionResult,
  type CostOptimizationResult,
  type TurnoverAnalysisResult,
} from "@/lib/ai-insights";
import {
  classifyDemandPatterns,
  runMonteCarloSimulation,
  mineAssociationRules,
  analyzeSupplierPerformance,
  buildWhatIfData,
  type DemandClassificationResult,
  type MonteCarloResult,
  type AssociationRulesResult,
  type SupplierPerformanceResult,
  type WhatIfBaseData,
} from "@/lib/ai-insights-advanced";

// ---------------------------------------------------------------------------
// Data Fetchers
// ---------------------------------------------------------------------------

async function fetchInventoryData(): Promise<ProductInventoryData[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("inventory")
    .select(
      "quantity, min_quantity, products(id, name, sku, unit_price, cost_price, categories(name))"
    );

  if (!data) return [];

  return data
    .map((row) => {
      const product = row.products as unknown as {
        id: string;
        name: string;
        sku: string;
        unit_price: number;
        cost_price: number;
        categories: { name: string } | null;
      } | null;

      if (!product) return null;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        categoryName: product.categories?.name ?? "미분류",
        quantity: row.quantity,
        minQuantity: row.min_quantity,
        unitPrice: product.unit_price,
        costPrice: product.cost_price,
      };
    })
    .filter((item): item is ProductInventoryData => item !== null);
}

async function fetchOrderHistory(
  months: number
): Promise<OrderHistoryData[]> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startStr = startDate.toISOString().split("T")[0];

  const { data } = await supabase
    .from("order_items")
    .select(
      "product_id, quantity, unit_price, total_price, orders!inner(order_date, type)"
    )
    .gte("orders.order_date", startStr);

  if (!data) return [];

  return data.map((item) => {
    const order = item.orders as unknown as {
      order_date: string;
      type: "purchase" | "sale";
    };

    return {
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      orderDate: order.order_date,
      orderType: order.type,
    };
  });
}

interface SupplierOrderRaw {
  supplierId: string;
  supplierName: string;
  orderDate: string;
  deliveredDate: string | null;
  status: string;
  totalAmount: number;
}

async function fetchSupplierOrders(): Promise<SupplierOrderRaw[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "order_date, status, total_amount, created_at, updated_at, supplier_id, suppliers(id, name)"
    )
    .eq("type", "purchase")
    .not("supplier_id", "is", null);

  if (!data) return [];

  return data
    .map((row) => {
      const supplier = row.suppliers as unknown as {
        id: string;
        name: string;
      } | null;
      if (!supplier) return null;

      // Approximate delivered date: use updated_at for delivered orders
      const deliveredDate =
        row.status === "delivered" ? row.updated_at : null;

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        orderDate: row.order_date,
        deliveredDate,
        status: row.status,
        totalAmount: row.total_amount,
      };
    })
    .filter((item): item is SupplierOrderRaw => item !== null);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AllInsightsResult {
  healthScore: HealthScoreResult;
  abcAnalysis: AbcXyzResult;
  smartReorder: SmartReorderResult;
  anomalyDetection: AnomalyDetectionResult;
  costOptimization: CostOptimizationResult;
  turnoverAnalysis: TurnoverAnalysisResult;
  // Advanced
  demandClassification: DemandClassificationResult;
  monteCarlo: MonteCarloResult;
  associationRules: AssociationRulesResult;
  supplierPerformance: SupplierPerformanceResult;
  whatIfData: WhatIfBaseData;
}

export async function getAllInsights(): Promise<AllInsightsResult> {
  const [inventory, orders, supplierOrders] = await Promise.all([
    fetchInventoryData(),
    fetchOrderHistory(12),
    fetchSupplierOrders(),
  ]);

  // Basic analyses
  const healthScore = calculateHealthScore(inventory, orders);
  const abcAnalysis = calculateAbcXyzAnalysis(inventory, orders);
  const smartReorder = calculateSmartReorder(inventory, orders);
  const anomalyDetection = detectAnomalies(inventory, orders);
  const costOptimization = calculateCostOptimization(inventory, orders);
  const turnoverAnalysis = calculateTurnoverAnalysis(inventory, orders);

  // Advanced analyses
  const demandClassification = classifyDemandPatterns(inventory, orders);
  const monteCarlo = runMonteCarloSimulation(inventory, orders, 500);
  const associationRules = mineAssociationRules(orders, inventory);
  const supplierPerformance = analyzeSupplierPerformance(supplierOrders);
  const whatIfData = buildWhatIfData(inventory, orders);

  return {
    healthScore,
    abcAnalysis,
    smartReorder,
    anomalyDetection,
    costOptimization,
    turnoverAnalysis,
    demandClassification,
    monteCarlo,
    associationRules,
    supplierPerformance,
    whatIfData,
  };
}
