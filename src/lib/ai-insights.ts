// ---------------------------------------------------------------------------
// AI Insights — Pure functional analysis library
// No DB calls; operates on data passed as arguments.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface ProductInventoryData {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  costPrice: number;
}

export interface OrderHistoryData {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderDate: string; // ISO date
  orderType: "purchase" | "sale";
}

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

// --- Health Score ---
export type HealthGrade = "A" | "B" | "C" | "D" | "F";

export interface HealthComponent {
  label: string;
  score: number; // 0-100
  weight: number;
  description: string;
}

export interface HealthScoreResult {
  score: number; // 0-100
  grade: HealthGrade;
  components: HealthComponent[];
}

// --- ABC/XYZ Analysis ---
export type AbcClass = "A" | "B" | "C";
export type XyzClass = "X" | "Y" | "Z";

export interface AbcXyzItem {
  productId: string;
  productName: string;
  sku: string;
  abcClass: AbcClass;
  xyzClass: XyzClass;
  totalRevenue: number;
  revenueShare: number; // 0-1
  cumulativeShare: number; // 0-1
  cv: number; // coefficient of variation
  recommendation: string;
}

export interface AbcXyzResult {
  items: AbcXyzItem[];
  summary: {
    A: number;
    B: number;
    C: number;
    X: number;
    Y: number;
    Z: number;
  };
}

// --- Smart Reorder (EOQ) ---
export interface ReorderItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minQuantity: number;
  avgDailyDemand: number;
  eoq: number;
  safetyStock: number;
  reorderPoint: number;
  needsReorder: boolean;
  currentCost: number;
  optimalCost: number;
  savingsPercent: number;
}

export interface SmartReorderResult {
  items: ReorderItem[];
  totalCurrentCost: number;
  totalOptimalCost: number;
  totalSavings: number;
  reorderNeededCount: number;
}

// --- Anomaly Detection ---
export type AnomalySeverity = "critical" | "warning" | "info";
export type AnomalyType =
  | "demand_spike"
  | "demand_drop"
  | "cost_change"
  | "abnormal_pattern";

export interface AnomalyItem {
  productId: string;
  productName: string;
  sku: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  zScore: number;
  description: string;
  suggestion: string;
  detectedAt: string; // month label
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyItem[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

// --- Cost Optimization ---
export interface DeadStockItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  value: number;
  daysSinceLastSale: number;
}

export interface OverstockItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  excessQuantity: number;
  excessValue: number;
}

export interface MarginItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  margin: number; // 0-1
}

export interface CostRecommendation {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialSavings: number;
}

export interface CategoryMargin {
  category: string;
  avgMargin: number;
  productCount: number;
  totalRevenue: number;
}

export interface CostOptimizationResult {
  deadStock: DeadStockItem[];
  overstock: OverstockItem[];
  lowMarginProducts: MarginItem[];
  categoryMargins: CategoryMargin[];
  recommendations: CostRecommendation[];
  totalDeadStockValue: number;
  totalOverstockValue: number;
  totalPotentialSavings: number;
}

// --- Turnover Analysis ---
export type TurnoverClass = "fast" | "normal" | "slow" | "stagnant";

export interface TurnoverItem {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  turnoverRate: number; // annual
  supplyDays: number; // 365 / turnoverRate
  turnoverClass: TurnoverClass;
  avgInventoryValue: number;
  annualCogs: number;
}

export interface CategoryTurnover {
  category: string;
  avgTurnoverRate: number;
  productCount: number;
  totalCogs: number;
}

export interface TurnoverAnalysisResult {
  items: TurnoverItem[];
  categoryTurnovers: CategoryTurnover[];
  avgTurnoverRate: number;
  avgSupplyDays: number;
  benchmarks: {
    fast: number;
    normal: number;
    slow: number;
    stagnant: number;
  };
}

// ---------------------------------------------------------------------------
// 1. Health Score
// ---------------------------------------------------------------------------

export function calculateHealthScore(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): HealthScoreResult {
  if (inventory.length === 0) {
    return {
      score: 0,
      grade: "F",
      components: defaultHealthComponents(),
    };
  }

  // Stock Coverage: what % of products have adequate stock (qty >= min)
  const adequateCount = inventory.filter(
    (p) => p.quantity >= p.minQuantity
  ).length;
  const stockCoverage = (adequateCount / inventory.length) * 100;

  // Stockout Risk: inverse of % products at or below 0
  const stockoutCount = inventory.filter((p) => p.quantity <= 0).length;
  const stockoutRisk = (1 - stockoutCount / inventory.length) * 100;

  // Overstock Ratio: inverse of % products with qty > 3x min
  const overstockCount = inventory.filter(
    (p) => p.minQuantity > 0 && p.quantity > p.minQuantity * 3
  ).length;
  const overstockRatio = (1 - overstockCount / inventory.length) * 100;

  // Turnover Rate score: based on average turnover
  const salesByProduct = new Map<string, number>();
  for (const o of orders) {
    if (o.orderType === "sale") {
      salesByProduct.set(
        o.productId,
        (salesByProduct.get(o.productId) ?? 0) + o.quantity
      );
    }
  }
  let totalTurnover = 0;
  let turnoverCount = 0;
  for (const p of inventory) {
    const annualSales = (salesByProduct.get(p.productId) ?? 0) * (12 / Math.max(getMonthSpan(orders), 1));
    const avgInv = p.quantity > 0 ? p.quantity : 1;
    const tr = annualSales / avgInv;
    totalTurnover += tr;
    turnoverCount++;
  }
  const avgTurnover = turnoverCount > 0 ? totalTurnover / turnoverCount : 0;
  // Ideal turnover ~6-12. Score peaks at 8.
  const turnoverScore = Math.min(100, (avgTurnover / 8) * 100);

  // Data Quality: products with orders / total products
  const productsWithOrders = new Set(orders.map((o) => o.productId)).size;
  const dataQuality = inventory.length > 0
    ? (productsWithOrders / inventory.length) * 100
    : 0;

  const components: HealthComponent[] = [
    {
      label: "재고 충족률",
      score: Math.round(stockCoverage),
      weight: 25,
      description: `${adequateCount}/${inventory.length}개 상품이 최소 수량 이상`,
    },
    {
      label: "품절 위험도",
      score: Math.round(stockoutRisk),
      weight: 25,
      description: `${stockoutCount}개 상품 품절`,
    },
    {
      label: "과잉재고 비율",
      score: Math.round(overstockRatio),
      weight: 20,
      description: `${overstockCount}개 상품 과잉 (최소 수량 3배 초과)`,
    },
    {
      label: "재고 회전율",
      score: Math.round(Math.min(100, turnoverScore)),
      weight: 20,
      description: `평균 회전율 ${avgTurnover.toFixed(1)}회/년`,
    },
    {
      label: "데이터 품질",
      score: Math.round(Math.min(100, dataQuality)),
      weight: 10,
      description: `${productsWithOrders}/${inventory.length}개 상품에 주문 데이터`,
    },
  ];

  const score = Math.round(
    components.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0)
  );

  return {
    score,
    grade: scoreToGrade(score),
    components,
  };
}

function defaultHealthComponents(): HealthComponent[] {
  return [
    { label: "재고 충족률", score: 0, weight: 25, description: "데이터 없음" },
    { label: "품절 위험도", score: 0, weight: 25, description: "데이터 없음" },
    { label: "과잉재고 비율", score: 0, weight: 20, description: "데이터 없음" },
    { label: "재고 회전율", score: 0, weight: 20, description: "데이터 없음" },
    { label: "데이터 품질", score: 0, weight: 10, description: "데이터 없음" },
  ];
}

function scoreToGrade(score: number): HealthGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// 2. ABC/XYZ Analysis
// ---------------------------------------------------------------------------

export function calculateAbcXyzAnalysis(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): AbcXyzResult {
  // Calculate total revenue per product from sales
  const revenueMap = new Map<string, number>();
  const monthlySalesMap = new Map<string, Map<string, number>>();

  for (const o of orders) {
    if (o.orderType === "sale") {
      revenueMap.set(
        o.productId,
        (revenueMap.get(o.productId) ?? 0) + o.totalPrice
      );

      const monthKey = o.orderDate.substring(0, 7); // YYYY-MM
      if (!monthlySalesMap.has(o.productId)) {
        monthlySalesMap.set(o.productId, new Map());
      }
      const pm = monthlySalesMap.get(o.productId)!;
      pm.set(monthKey, (pm.get(monthKey) ?? 0) + o.quantity);
    }
  }

  const totalRevenue = Array.from(revenueMap.values()).reduce(
    (s, v) => s + v,
    0
  );

  // Sort by revenue descending
  const sorted = inventory
    .map((p) => ({
      ...p,
      totalRevenue: revenueMap.get(p.productId) ?? 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  let cumulative = 0;
  const items: AbcXyzItem[] = sorted.map((p) => {
    const share = totalRevenue > 0 ? p.totalRevenue / totalRevenue : 0;
    cumulative += share;

    // ABC classification
    let abcClass: AbcClass;
    if (cumulative <= 0.8) abcClass = "A";
    else if (cumulative <= 0.95) abcClass = "B";
    else abcClass = "C";

    // XYZ classification via coefficient of variation
    const cv = calculateCV(monthlySalesMap.get(p.productId));
    let xyzClass: XyzClass;
    if (cv <= 0.5) xyzClass = "X";
    else if (cv <= 1.0) xyzClass = "Y";
    else xyzClass = "Z";

    return {
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      abcClass,
      xyzClass,
      totalRevenue: p.totalRevenue,
      revenueShare: share,
      cumulativeShare: cumulative,
      cv,
      recommendation: getAbcXyzRecommendation(abcClass, xyzClass),
    };
  });

  const summary = {
    A: items.filter((i) => i.abcClass === "A").length,
    B: items.filter((i) => i.abcClass === "B").length,
    C: items.filter((i) => i.abcClass === "C").length,
    X: items.filter((i) => i.xyzClass === "X").length,
    Y: items.filter((i) => i.xyzClass === "Y").length,
    Z: items.filter((i) => i.xyzClass === "Z").length,
  };

  return { items, summary };
}

function calculateCV(monthlySales: Map<string, number> | undefined): number {
  if (!monthlySales || monthlySales.size === 0) return 2; // no data = very irregular

  const values = Array.from(monthlySales.values());
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return 2;

  const variance =
    values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance) / avg;
}

function getAbcXyzRecommendation(abc: AbcClass, xyz: XyzClass): string {
  const matrix: Record<string, string> = {
    AX: "핵심 상품 — 자동 발주, 최적 재고 유지",
    AY: "주요 상품 — 안전재고 확보, 주기적 검토",
    AZ: "고매출 불규칙 — 수요 예측 강화, 버퍼 재고",
    BX: "안정 수요 — 정기 발주, 표준 관리",
    BY: "중간 변동 — 월간 검토, 유연한 발주",
    BZ: "중간 불규칙 — 주문 시점 주의, JIT 검토",
    CX: "저매출 안정 — 최소 재고, 자동화 관리",
    CY: "저매출 변동 — 재고 축소 검토",
    CZ: "저매출 불규칙 — 단종/처분 검토",
  };
  return matrix[`${abc}${xyz}`] ?? "분석 데이터 부족";
}

// ---------------------------------------------------------------------------
// 3. Smart Reorder (EOQ)
// ---------------------------------------------------------------------------

export function calculateSmartReorder(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): SmartReorderResult {
  const monthSpan = Math.max(getMonthSpan(orders), 1);

  // Aggregate daily demand per product
  const salesMap = new Map<string, number>();
  for (const o of orders) {
    if (o.orderType === "sale") {
      salesMap.set(
        o.productId,
        (salesMap.get(o.productId) ?? 0) + o.quantity
      );
    }
  }

  // Monthly demand std dev per product
  const monthlyDemandMap = buildMonthlyDemandMap(orders);

  const leadTimeDays = 14;
  const zScore = 1.65; // 95% service level

  const items: ReorderItem[] = [];

  for (const p of inventory) {
    const totalSales = salesMap.get(p.productId) ?? 0;
    const dailyDemand = totalSales / (monthSpan * 30);

    if (dailyDemand <= 0) continue;

    const annualDemand = dailyDemand * 365;
    const orderCost = p.costPrice * 0.05; // 5% of cost as order cost
    const holdingCost = p.costPrice * 0.2; // 20% of cost as holding cost/year

    // EOQ = sqrt(2 * D * S / H)
    const eoq = Math.max(
      1,
      Math.round(Math.sqrt((2 * annualDemand * orderCost) / holdingCost))
    );

    // Safety stock = Z * σd * √L
    const monthlyValues = monthlyDemandMap.get(p.productId) ?? [];
    const dailyStdDev = calculateStdDev(monthlyValues) / 30;
    const safetyStock = Math.max(
      1,
      Math.ceil(zScore * dailyStdDev * Math.sqrt(leadTimeDays))
    );

    // Reorder point
    const reorderPoint = Math.ceil(
      dailyDemand * leadTimeDays + safetyStock
    );

    // Cost comparison
    const currentOrderQty = p.minQuantity > 0 ? p.minQuantity : eoq;
    const currentOrderFreq = annualDemand / currentOrderQty;
    const currentCost =
      currentOrderFreq * orderCost +
      (currentOrderQty / 2) * holdingCost;

    const optimalOrderFreq = annualDemand / eoq;
    const optimalCost =
      optimalOrderFreq * orderCost + (eoq / 2) * holdingCost;

    const savingsPercent =
      currentCost > 0
        ? ((currentCost - optimalCost) / currentCost) * 100
        : 0;

    items.push({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      currentStock: p.quantity,
      minQuantity: p.minQuantity,
      avgDailyDemand: Math.round(dailyDemand * 100) / 100,
      eoq,
      safetyStock,
      reorderPoint,
      needsReorder: p.quantity <= reorderPoint,
      currentCost: Math.round(currentCost),
      optimalCost: Math.round(optimalCost),
      savingsPercent: Math.round(savingsPercent * 10) / 10,
    });
  }

  // Sort: needs reorder first, then by stock level ascending
  items.sort((a, b) => {
    if (a.needsReorder !== b.needsReorder)
      return a.needsReorder ? -1 : 1;
    return a.currentStock - b.currentStock;
  });

  const totalCurrentCost = items.reduce((s, i) => s + i.currentCost, 0);
  const totalOptimalCost = items.reduce((s, i) => s + i.optimalCost, 0);

  return {
    items,
    totalCurrentCost,
    totalOptimalCost,
    totalSavings: totalCurrentCost - totalOptimalCost,
    reorderNeededCount: items.filter((i) => i.needsReorder).length,
  };
}

// ---------------------------------------------------------------------------
// 4. Anomaly Detection
// ---------------------------------------------------------------------------

export function detectAnomalies(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): AnomalyDetectionResult {
  const anomalies: AnomalyItem[] = [];
  const productMap = new Map(inventory.map((p) => [p.productId, p]));

  // Group orders by product and month
  const monthlyData = new Map<
    string,
    Map<string, { demand: number; cost: number; count: number }>
  >();

  for (const o of orders) {
    const monthKey = o.orderDate.substring(0, 7);
    if (!monthlyData.has(o.productId)) {
      monthlyData.set(o.productId, new Map());
    }
    const pm = monthlyData.get(o.productId)!;
    if (!pm.has(monthKey)) {
      pm.set(monthKey, { demand: 0, cost: 0, count: 0 });
    }
    const entry = pm.get(monthKey)!;
    if (o.orderType === "sale") {
      entry.demand += o.quantity;
    }
    entry.cost += o.unitPrice * o.quantity;
    entry.count++;
  }

  for (const [productId, months] of monthlyData) {
    const product = productMap.get(productId);
    if (!product) continue;

    const sortedKeys = Array.from(months.keys()).sort();
    const demands = sortedKeys.map((k) => months.get(k)!.demand);
    const costs = sortedKeys.map((k) => months.get(k)!.cost);

    // Check demand anomalies
    if (demands.length >= 3) {
      const lastDemand = demands[demands.length - 1];
      const mean = demands.reduce((s, v) => s + v, 0) / demands.length;
      const stdDev = calculateStdDev(demands);

      if (stdDev > 0) {
        const z = (lastDemand - mean) / stdDev;
        const lastMonth = sortedKeys[sortedKeys.length - 1];
        const [, m] = lastMonth.split("-");

        if (z > 1.5) {
          anomalies.push({
            productId,
            productName: product.productName,
            sku: product.sku,
            type: "demand_spike",
            severity: getSeverity(Math.abs(z)),
            zScore: Math.round(z * 100) / 100,
            description: `${parseInt(m)}월 수요가 평균 대비 ${Math.round((z - 1) * 100)}% 급증`,
            suggestion: "안전재고 상향 및 긴급 발주 검토",
            detectedAt: `${parseInt(m)}월`,
          });
        } else if (z < -1.5) {
          anomalies.push({
            productId,
            productName: product.productName,
            sku: product.sku,
            type: "demand_drop",
            severity: getSeverity(Math.abs(z)),
            zScore: Math.round(z * 100) / 100,
            description: `${parseInt(m)}월 수요가 평균 대비 ${Math.round((Math.abs(z) - 1) * 100)}% 급감`,
            suggestion: "재고 축소 및 프로모션 검토",
            detectedAt: `${parseInt(m)}월`,
          });
        }
      }
    }

    // Check cost anomalies
    if (costs.length >= 3) {
      const lastCost = costs[costs.length - 1];
      const mean = costs.reduce((s, v) => s + v, 0) / costs.length;
      const stdDev = calculateStdDev(costs);

      if (stdDev > 0) {
        const z = (lastCost - mean) / stdDev;
        const lastMonth = sortedKeys[sortedKeys.length - 1];
        const [, m] = lastMonth.split("-");

        if (Math.abs(z) > 2) {
          anomalies.push({
            productId,
            productName: product.productName,
            sku: product.sku,
            type: "cost_change",
            severity: getSeverity(Math.abs(z)),
            zScore: Math.round(z * 100) / 100,
            description: `${parseInt(m)}월 거래 금액이 평균 대비 ${z > 0 ? "증가" : "감소"} (Z=${Math.abs(z).toFixed(1)})`,
            suggestion:
              z > 0
                ? "공급처 단가 인상 확인, 대체 공급처 검토"
                : "할인 판매 확인, 마진 점검",
            detectedAt: `${parseInt(m)}월`,
          });
        }
      }
    }
  }

  // Sort by severity
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  anomalies.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return {
    anomalies,
    criticalCount: anomalies.filter((a) => a.severity === "critical").length,
    warningCount: anomalies.filter((a) => a.severity === "warning").length,
    infoCount: anomalies.filter((a) => a.severity === "info").length,
  };
}

function getSeverity(absZ: number): AnomalySeverity {
  if (absZ > 3) return "critical";
  if (absZ > 2) return "warning";
  return "info";
}

// ---------------------------------------------------------------------------
// 5. Cost Optimization
// ---------------------------------------------------------------------------

export function calculateCostOptimization(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): CostOptimizationResult {
  const now = new Date();

  // Last sale date per product
  const lastSaleMap = new Map<string, Date>();
  const salesMap = new Map<string, number>();
  for (const o of orders) {
    if (o.orderType === "sale") {
      const date = new Date(o.orderDate);
      const current = lastSaleMap.get(o.productId);
      if (!current || date > current) {
        lastSaleMap.set(o.productId, date);
      }
      salesMap.set(
        o.productId,
        (salesMap.get(o.productId) ?? 0) + o.totalPrice
      );
    }
  }

  // Dead stock: 60+ days without sales
  const deadStock: DeadStockItem[] = [];
  for (const p of inventory) {
    if (p.quantity <= 0) continue;
    const lastSale = lastSaleMap.get(p.productId);
    const daysSince = lastSale
      ? Math.floor(
          (now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    if (daysSince >= 60) {
      deadStock.push({
        productId: p.productId,
        productName: p.productName,
        sku: p.sku,
        quantity: p.quantity,
        value: p.quantity * p.costPrice,
        daysSinceLastSale: daysSince,
      });
    }
  }
  deadStock.sort((a, b) => b.value - a.value);

  // Overstock: quantity > min * 3
  const overstock: OverstockItem[] = [];
  for (const p of inventory) {
    if (p.minQuantity > 0 && p.quantity > p.minQuantity * 3) {
      const excess = p.quantity - p.minQuantity;
      overstock.push({
        productId: p.productId,
        productName: p.productName,
        sku: p.sku,
        quantity: p.quantity,
        minQuantity: p.minQuantity,
        excessQuantity: excess,
        excessValue: excess * p.costPrice,
      });
    }
  }
  overstock.sort((a, b) => b.excessValue - a.excessValue);

  // Low margin products (margin < 10%)
  const lowMarginProducts: MarginItem[] = [];
  for (const p of inventory) {
    if (p.unitPrice <= 0 || p.costPrice <= 0) continue;
    const margin = (p.unitPrice - p.costPrice) / p.unitPrice;
    if (margin < 0.1) {
      lowMarginProducts.push({
        productId: p.productId,
        productName: p.productName,
        sku: p.sku,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        margin,
      });
    }
  }
  lowMarginProducts.sort((a, b) => a.margin - b.margin);

  // Category margin analysis
  const categoryData = new Map<
    string,
    { totalMargin: number; count: number; totalRevenue: number }
  >();
  for (const p of inventory) {
    if (p.unitPrice <= 0) continue;
    const margin = (p.unitPrice - p.costPrice) / p.unitPrice;
    const revenue = salesMap.get(p.productId) ?? 0;
    const cat = p.categoryName || "미분류";

    const existing = categoryData.get(cat) ?? {
      totalMargin: 0,
      count: 0,
      totalRevenue: 0,
    };
    existing.totalMargin += margin;
    existing.count++;
    existing.totalRevenue += revenue;
    categoryData.set(cat, existing);
  }

  const categoryMargins: CategoryMargin[] = Array.from(
    categoryData.entries()
  )
    .map(([category, data]) => ({
      category,
      avgMargin: data.count > 0 ? data.totalMargin / data.count : 0,
      productCount: data.count,
      totalRevenue: data.totalRevenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Recommendations
  const totalDeadStockValue = deadStock.reduce((s, d) => s + d.value, 0);
  const totalOverstockValue = overstock.reduce(
    (s, o) => s + o.excessValue,
    0
  );

  const recommendations: CostRecommendation[] = [];

  if (deadStock.length > 0) {
    recommendations.push({
      priority: "high",
      title: "사장재고 처분",
      description: `${deadStock.length}개 상품이 60일 이상 판매 없음. 할인 판매 또는 폐기 검토`,
      potentialSavings: Math.round(totalDeadStockValue * 0.3),
    });
  }

  if (overstock.length > 0) {
    recommendations.push({
      priority: "high",
      title: "과잉재고 감축",
      description: `${overstock.length}개 상품이 최소 수량의 3배 이상 보유 중`,
      potentialSavings: Math.round(totalOverstockValue * 0.15),
    });
  }

  if (lowMarginProducts.length > 0) {
    recommendations.push({
      priority: "medium",
      title: "저마진 상품 가격 조정",
      description: `${lowMarginProducts.length}개 상품의 마진이 10% 미만`,
      potentialSavings: Math.round(
        lowMarginProducts.reduce(
          (s, p) => s + (p.unitPrice * 0.1 - (p.unitPrice - p.costPrice)),
          0
        ) * 12
      ),
    });
  }

  const lowTurnoverCategories = categoryMargins.filter(
    (c) => c.avgMargin < 0.15 && c.productCount > 1
  );
  if (lowTurnoverCategories.length > 0) {
    recommendations.push({
      priority: "medium",
      title: "카테고리 수익성 개선",
      description: `${lowTurnoverCategories.map((c) => c.category).join(", ")} 카테고리의 평균 마진이 낮음`,
      potentialSavings: 0,
    });
  }

  recommendations.sort((a, b) => {
    const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });

  const totalPotentialSavings = recommendations.reduce(
    (s, r) => s + r.potentialSavings,
    0
  );

  return {
    deadStock,
    overstock,
    lowMarginProducts,
    categoryMargins,
    recommendations: recommendations.slice(0, 5),
    totalDeadStockValue,
    totalOverstockValue,
    totalPotentialSavings,
  };
}

// ---------------------------------------------------------------------------
// 6. Turnover Analysis
// ---------------------------------------------------------------------------

export function calculateTurnoverAnalysis(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): TurnoverAnalysisResult {
  const monthSpan = Math.max(getMonthSpan(orders), 1);

  // Annual COGS per product
  const cogsMap = new Map<string, number>();
  for (const o of orders) {
    if (o.orderType === "sale") {
      // COGS = qty * cost_price of product
      const product = inventory.find((p) => p.productId === o.productId);
      const costPrice = product?.costPrice ?? o.unitPrice;
      cogsMap.set(
        o.productId,
        (cogsMap.get(o.productId) ?? 0) + o.quantity * costPrice
      );
    }
  }

  const items: TurnoverItem[] = [];

  for (const p of inventory) {
    const periodCogs = cogsMap.get(p.productId) ?? 0;
    const annualCogs = (periodCogs / monthSpan) * 12;
    const avgInventoryValue = p.quantity * p.costPrice || 1;

    const turnoverRate = annualCogs / avgInventoryValue;
    const supplyDays = turnoverRate > 0 ? 365 / turnoverRate : 999;

    let turnoverClass: TurnoverClass;
    if (turnoverRate >= 8) turnoverClass = "fast";
    else if (turnoverRate >= 4) turnoverClass = "normal";
    else if (turnoverRate >= 1) turnoverClass = "slow";
    else turnoverClass = "stagnant";

    items.push({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      categoryName: p.categoryName,
      turnoverRate: Math.round(turnoverRate * 10) / 10,
      supplyDays: Math.round(supplyDays),
      turnoverClass,
      avgInventoryValue: Math.round(avgInventoryValue),
      annualCogs: Math.round(annualCogs),
    });
  }

  items.sort((a, b) => b.turnoverRate - a.turnoverRate);

  // Category turnovers
  const catData = new Map<
    string,
    { totalRate: number; count: number; totalCogs: number }
  >();
  for (const item of items) {
    const cat = item.categoryName || "미분류";
    const existing = catData.get(cat) ?? {
      totalRate: 0,
      count: 0,
      totalCogs: 0,
    };
    existing.totalRate += item.turnoverRate;
    existing.count++;
    existing.totalCogs += item.annualCogs;
    catData.set(cat, existing);
  }

  const categoryTurnovers: CategoryTurnover[] = Array.from(
    catData.entries()
  )
    .map(([category, data]) => ({
      category,
      avgTurnoverRate:
        Math.round((data.totalRate / data.count) * 10) / 10,
      productCount: data.count,
      totalCogs: Math.round(data.totalCogs),
    }))
    .sort((a, b) => b.avgTurnoverRate - a.avgTurnoverRate);

  const totalRate = items.reduce((s, i) => s + i.turnoverRate, 0);
  const avgTurnoverRate =
    items.length > 0
      ? Math.round((totalRate / items.length) * 10) / 10
      : 0;
  const avgSupplyDays =
    avgTurnoverRate > 0 ? Math.round(365 / avgTurnoverRate) : 999;

  return {
    items,
    categoryTurnovers,
    avgTurnoverRate,
    avgSupplyDays,
    benchmarks: {
      fast: items.filter((i) => i.turnoverClass === "fast").length,
      normal: items.filter((i) => i.turnoverClass === "normal").length,
      slow: items.filter((i) => i.turnoverClass === "slow").length,
      stagnant: items.filter((i) => i.turnoverClass === "stagnant").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

function getMonthSpan(orders: OrderHistoryData[]): number {
  if (orders.length === 0) return 0;
  const dates = orders.map((o) => new Date(o.orderDate).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24 * 30)));
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function buildMonthlyDemandMap(
  orders: OrderHistoryData[]
): Map<string, number[]> {
  const map = new Map<string, Map<string, number>>();

  for (const o of orders) {
    if (o.orderType !== "sale") continue;
    const monthKey = o.orderDate.substring(0, 7);
    if (!map.has(o.productId)) map.set(o.productId, new Map());
    const pm = map.get(o.productId)!;
    pm.set(monthKey, (pm.get(monthKey) ?? 0) + o.quantity);
  }

  const result = new Map<string, number[]>();
  for (const [pid, months] of map) {
    result.set(pid, Array.from(months.values()));
  }
  return result;
}
