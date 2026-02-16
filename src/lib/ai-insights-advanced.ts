// ---------------------------------------------------------------------------
// Advanced AI Insights — Next-level analytics algorithms
// Pure functional. No DB calls; operates on data passed as arguments.
// ---------------------------------------------------------------------------

import type { ProductInventoryData, OrderHistoryData } from "./ai-insights";

// ============================================================================
// 1. DEMAND PATTERN CLASSIFICATION + OPTIMAL FORECASTING
// ============================================================================

export type DemandPattern = "smooth" | "intermittent" | "erratic" | "lumpy";

export interface DemandClassification {
  productId: string;
  productName: string;
  sku: string;
  pattern: DemandPattern;
  patternLabel: string;
  adi: number; // Average Demand Interval
  cv2: number; // CV² of non-zero demands
  optimalMethod: string;
  forecast: number[]; // next 3 months
  confidence: number;
  monthlyDemand: number[]; // historical monthly demand
}

export interface DemandClassificationResult {
  items: DemandClassification[];
  patternSummary: Record<DemandPattern, number>;
  avgConfidence: number;
}

const patternLabels: Record<DemandPattern, string> = {
  smooth: "안정 수요",
  intermittent: "간헐 수요",
  erratic: "불규칙 수요",
  lumpy: "돌발 수요",
};

const patternMethods: Record<DemandPattern, string> = {
  smooth: "Holt-Winters 지수 평활법",
  intermittent: "Croston 간헐수요 예측법",
  erratic: "가중 이동평균 + 강화 안전재고",
  lumpy: "Max-Level 정책 + 버퍼",
};

export function classifyDemandPatterns(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): DemandClassificationResult {
  const monthlyMap = buildMonthlySeriesMap(orders, 12);
  const items: DemandClassification[] = [];

  for (const p of inventory) {
    const monthly = monthlyMap.get(p.productId) ?? new Array(12).fill(0);
    const nonZero = monthly.filter((v) => v > 0);

    // ADI: Average Demand Interval
    // = total periods / number of periods with demand
    const periodsWithDemand = nonZero.length;
    const adi = periodsWithDemand > 0 ? monthly.length / periodsWithDemand : 999;

    // CV² of non-zero demands
    const cv2 = periodsWithDemand >= 2 ? calcCV2(nonZero) : 4;

    // Classification (Syntetos-Boylan framework)
    let pattern: DemandPattern;
    if (adi < 1.32 && cv2 < 0.49) pattern = "smooth";
    else if (adi >= 1.32 && cv2 < 0.49) pattern = "intermittent";
    else if (adi < 1.32 && cv2 >= 0.49) pattern = "erratic";
    else pattern = "lumpy";

    // Apply optimal forecasting method per pattern
    let forecast: number[];
    let confidence: number;

    switch (pattern) {
      case "smooth":
        ({ forecast, confidence } = holtWintersForecast(monthly, 3));
        break;
      case "intermittent":
        ({ forecast, confidence } = crostonForecast(monthly, 3));
        break;
      case "erratic":
        ({ forecast, confidence } = weightedMAForecast(monthly, 3));
        break;
      case "lumpy":
        ({ forecast, confidence } = maxLevelForecast(monthly, 3));
        break;
    }

    items.push({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      pattern,
      patternLabel: patternLabels[pattern],
      adi: round2(adi),
      cv2: round2(cv2),
      optimalMethod: patternMethods[pattern],
      forecast,
      confidence,
      monthlyDemand: monthly,
    });
  }

  const patternSummary: Record<DemandPattern, number> = {
    smooth: 0,
    intermittent: 0,
    erratic: 0,
    lumpy: 0,
  };
  for (const item of items) patternSummary[item.pattern]++;

  const avgConfidence =
    items.length > 0
      ? Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length)
      : 0;

  return { items, patternSummary, avgConfidence };
}

// --- Holt-Winters Double Exponential Smoothing ---
function holtWintersForecast(
  data: number[],
  periods: number
): { forecast: number[]; confidence: number } {
  if (data.length < 3) return fallbackForecast(data, periods);

  const alpha = 0.3; // level smoothing
  const beta = 0.1; // trend smoothing

  let level = data[0];
  let trend = data.length > 1 ? data[1] - data[0] : 0;

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const forecast: number[] = [];
  for (let h = 1; h <= periods; h++) {
    forecast.push(Math.max(0, Math.round(level + h * trend)));
  }

  // Confidence based on fit quality
  const fitted = computeFitted(data, alpha, beta);
  const mape = calcMAPE(data, fitted);
  const confidence = Math.max(10, Math.round(100 - mape));

  return { forecast, confidence };
}

function computeFitted(data: number[], alpha: number, beta: number): number[] {
  const fitted: number[] = [data[0]];
  let level = data[0];
  let trend = data.length > 1 ? data[1] - data[0] : 0;

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    const fittedValue = level + trend;
    fitted.push(Math.max(0, fittedValue));
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return fitted;
}

// --- Croston's Method for Intermittent Demand ---
function crostonForecast(
  data: number[],
  periods: number
): { forecast: number[]; confidence: number } {
  const nonZeroValues: number[] = [];
  const intervals: number[] = [];
  let lastNonZero = -1;

  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0) {
      nonZeroValues.push(data[i]);
      if (lastNonZero >= 0) {
        intervals.push(i - lastNonZero);
      }
      lastNonZero = i;
    }
  }

  if (nonZeroValues.length < 2 || intervals.length === 0) {
    return fallbackForecast(data, periods);
  }

  const alpha = 0.2;

  // Smooth demand sizes
  let smoothedDemand = nonZeroValues[0];
  for (let i = 1; i < nonZeroValues.length; i++) {
    smoothedDemand = alpha * nonZeroValues[i] + (1 - alpha) * smoothedDemand;
  }

  // Smooth intervals
  let smoothedInterval = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    smoothedInterval = alpha * intervals[i] + (1 - alpha) * smoothedInterval;
  }

  // Croston forecast = smoothed demand / smoothed interval
  const perPeriodForecast = smoothedInterval > 0
    ? smoothedDemand / smoothedInterval
    : smoothedDemand;

  const forecast = Array(periods).fill(Math.max(0, Math.round(perPeriodForecast)));
  const confidence = Math.min(70, Math.round(30 + (nonZeroValues.length / data.length) * 60));

  return { forecast, confidence };
}

// --- Weighted Moving Average (for erratic patterns) ---
function weightedMAForecast(
  data: number[],
  periods: number
): { forecast: number[]; confidence: number } {
  if (data.length < 2) return fallbackForecast(data, periods);

  // Exponentially decaying weights: recent months matter more
  const window = Math.min(6, data.length);
  const slice = data.slice(-window);
  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < slice.length; i++) {
    const weight = Math.pow(2, i); // 1, 2, 4, 8...
    weightedSum += slice[i] * weight;
    totalWeight += weight;
  }

  const avg = weightedSum / totalWeight;
  const forecast = Array(periods).fill(Math.max(0, Math.round(avg)));

  const cv = calcCV(data);
  const confidence = Math.max(10, Math.round(60 - cv * 20));

  return { forecast, confidence };
}

// --- Max-Level Policy (for lumpy demand) ---
function maxLevelForecast(
  data: number[],
  periods: number
): { forecast: number[]; confidence: number } {
  if (data.length === 0) return { forecast: Array(periods).fill(0), confidence: 10 };

  // Use max of recent observations as forecast (conservative)
  const recentMax = Math.max(...data.slice(-6));
  const avg = data.reduce((s, v) => s + v, 0) / data.length;

  // Blend max and average (70/30) for less extreme estimates
  const blended = Math.round(recentMax * 0.7 + avg * 0.3);
  const forecast = Array(periods).fill(Math.max(0, blended));
  const confidence = Math.max(10, 30);

  return { forecast, confidence };
}

function fallbackForecast(
  data: number[],
  periods: number
): { forecast: number[]; confidence: number } {
  const avg = data.length > 0
    ? Math.round(data.reduce((s, v) => s + v, 0) / data.length)
    : 0;
  return { forecast: Array(periods).fill(avg), confidence: 15 };
}

// ============================================================================
// 2. MONTE CARLO SIMULATION
// ============================================================================

export interface MonteCarloProduct {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  avgDailyDemand: number;
  demandStdDev: number;
  stockoutProbabilities: { days: number; probability: number }[];
  expectedStockoutDay: number; // median day of stockout
  optimalSafetyStock: number; // for 95% service level
  riskLevel: "low" | "medium" | "high" | "critical";
  histogram: { bucket: number; count: number }[]; // stockout day distribution
}

export interface MonteCarloResult {
  products: MonteCarloProduct[];
  overallRiskScore: number; // 0-100
  highRiskCount: number;
  criticalCount: number;
  simulationCount: number;
}

export function runMonteCarloSimulation(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[],
  simulationCount: number = 500
): MonteCarloResult {
  const monthlyMap = buildMonthlySeriesMap(orders, 12);
  const products: MonteCarloProduct[] = [];

  for (const p of inventory) {
    if (p.quantity <= 0) continue;

    const monthly = monthlyMap.get(p.productId) ?? [];
    const salesMonths = monthly.filter((v) => v > 0);
    if (salesMonths.length === 0) continue;

    const monthlyAvg = monthly.reduce((s, v) => s + v, 0) / Math.max(monthly.length, 1);
    const avgDailyDemand = monthlyAvg / 30;
    const monthlyStdDev = calcStdDev(monthly);
    const dailyStdDev = monthlyStdDev / 30;

    if (avgDailyDemand <= 0) continue;

    // Run simulations
    const stockoutDays: number[] = [];
    const timeHorizon = 90; // simulate up to 90 days

    for (let sim = 0; sim < simulationCount; sim++) {
      let stock = p.quantity;
      let day = 0;

      while (stock > 0 && day < timeHorizon) {
        day++;
        // Sample demand from normal distribution (Box-Muller)
        const demand = Math.max(0, normalRandom(avgDailyDemand, dailyStdDev));
        stock -= demand;
      }

      stockoutDays.push(stock <= 0 ? day : timeHorizon + 1);
    }

    // Calculate probabilities at key intervals
    const intervals = [7, 14, 30, 60, 90];
    const stockoutProbabilities = intervals.map((days) => ({
      days,
      probability: round2(
        stockoutDays.filter((d) => d <= days).length / simulationCount
      ),
    }));

    // Median stockout day
    const sorted = [...stockoutDays].sort((a, b) => a - b);
    const expectedStockoutDay = sorted[Math.floor(sorted.length / 2)];

    // Optimal safety stock for 95% service level
    const z95 = 1.645;
    const leadTimeDays = 14;
    const optimalSafetyStock = Math.ceil(
      z95 * dailyStdDev * Math.sqrt(leadTimeDays)
    );

    // Risk level
    const prob30 = stockoutProbabilities.find((p) => p.days === 30)?.probability ?? 0;
    let riskLevel: MonteCarloProduct["riskLevel"];
    if (prob30 >= 0.8) riskLevel = "critical";
    else if (prob30 >= 0.5) riskLevel = "high";
    else if (prob30 >= 0.2) riskLevel = "medium";
    else riskLevel = "low";

    // Build histogram (bucket by 5-day intervals)
    const histogram: { bucket: number; count: number }[] = [];
    for (let b = 5; b <= 95; b += 5) {
      histogram.push({
        bucket: b,
        count: stockoutDays.filter((d) => d > b - 5 && d <= b).length,
      });
    }

    products.push({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      currentStock: p.quantity,
      avgDailyDemand: round2(avgDailyDemand),
      demandStdDev: round2(dailyStdDev),
      stockoutProbabilities,
      expectedStockoutDay,
      optimalSafetyStock,
      riskLevel,
      histogram,
    });
  }

  // Sort by risk (critical first)
  const riskOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  products.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

  const highRiskCount = products.filter(
    (p) => p.riskLevel === "high" || p.riskLevel === "critical"
  ).length;
  const criticalCount = products.filter((p) => p.riskLevel === "critical").length;

  const overallRiskScore =
    products.length > 0
      ? Math.round(
          (products.reduce((s, p) => {
            const prob = p.stockoutProbabilities.find((sp) => sp.days === 30)?.probability ?? 0;
            return s + prob;
          }, 0) /
            products.length) *
            100
        )
      : 0;

  return {
    products,
    overallRiskScore,
    highRiskCount,
    criticalCount,
    simulationCount,
  };
}

// ============================================================================
// 3. ASSOCIATION RULE MINING (Market Basket Analysis)
// ============================================================================

export interface AssociationRule {
  antecedentId: string;
  antecedentName: string;
  consequentId: string;
  consequentName: string;
  support: number; // P(A∩B)
  confidence: number; // P(B|A)
  lift: number; // confidence / P(B)
  coOccurrences: number; // absolute count
}

export interface FrequentPair {
  productAId: string;
  productAName: string;
  productBId: string;
  productBName: string;
  count: number;
  support: number;
}

export interface AssociationRulesResult {
  rules: AssociationRule[];
  frequentPairs: FrequentPair[];
  totalOrders: number;
  insights: string[];
}

export function mineAssociationRules(
  orders: OrderHistoryData[],
  inventory: ProductInventoryData[],
  minSupport: number = 0.03,
  minConfidence: number = 0.25
): AssociationRulesResult {
  const productMap = new Map(inventory.map((p) => [p.productId, p.productName]));

  // Group items by order — approximate by grouping by same date
  // (since we don't have explicit order_id in OrderHistoryData)
  const baskets = new Map<string, Set<string>>();

  for (const o of orders) {
    if (o.orderType !== "sale") continue;
    // Use date as basket key (orders on same day are same "basket")
    const key = o.orderDate;
    if (!baskets.has(key)) baskets.set(key, new Set());
    baskets.get(key)!.add(o.productId);
  }

  const totalOrders = baskets.size;
  if (totalOrders < 3) {
    return { rules: [], frequentPairs: [], totalOrders, insights: [] };
  }

  // Count individual item frequency
  const itemFreq = new Map<string, number>();
  for (const basket of baskets.values()) {
    for (const item of basket) {
      itemFreq.set(item, (itemFreq.get(item) ?? 0) + 1);
    }
  }

  // Count pair co-occurrences
  const pairFreq = new Map<string, number>();
  for (const basket of baskets.values()) {
    const items = Array.from(basket);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const pairKey = [items[i], items[j]].sort().join("|");
        pairFreq.set(pairKey, (pairFreq.get(pairKey) ?? 0) + 1);
      }
    }
  }

  // Generate frequent pairs
  const frequentPairs: FrequentPair[] = [];
  for (const [pairKey, count] of pairFreq) {
    const support = count / totalOrders;
    if (support >= minSupport) {
      const [a, b] = pairKey.split("|");
      frequentPairs.push({
        productAId: a,
        productAName: productMap.get(a) ?? a,
        productBId: b,
        productBName: productMap.get(b) ?? b,
        count,
        support: round2(support),
      });
    }
  }
  frequentPairs.sort((a, b) => b.count - a.count);

  // Generate association rules (both directions for each pair)
  const rules: AssociationRule[] = [];

  for (const pair of frequentPairs) {
    const freqA = itemFreq.get(pair.productAId) ?? 0;
    const freqB = itemFreq.get(pair.productBId) ?? 0;

    // A → B
    const confAB = freqA > 0 ? pair.count / freqA : 0;
    const supportB = freqB / totalOrders;
    const liftAB = supportB > 0 ? confAB / supportB : 0;

    if (confAB >= minConfidence && liftAB > 1) {
      rules.push({
        antecedentId: pair.productAId,
        antecedentName: pair.productAName,
        consequentId: pair.productBId,
        consequentName: pair.productBName,
        support: pair.support,
        confidence: round2(confAB),
        lift: round2(liftAB),
        coOccurrences: pair.count,
      });
    }

    // B → A
    const confBA = freqB > 0 ? pair.count / freqB : 0;
    const supportA = freqA / totalOrders;
    const liftBA = supportA > 0 ? confBA / supportA : 0;

    if (confBA >= minConfidence && liftBA > 1) {
      rules.push({
        antecedentId: pair.productBId,
        antecedentName: pair.productBName,
        consequentId: pair.productAId,
        consequentName: pair.productAName,
        support: pair.support,
        confidence: round2(confBA),
        lift: round2(liftBA),
        coOccurrences: pair.count,
      });
    }
  }

  rules.sort((a, b) => b.lift - a.lift);

  // Generate insights
  const insights: string[] = [];
  if (rules.length > 0) {
    const topRule = rules[0];
    insights.push(
      `"${topRule.antecedentName}" 구매 시 "${topRule.consequentName}" 동시 구매 확률 ${(topRule.confidence * 100).toFixed(0)}% (Lift ${topRule.lift}x)`
    );
  }
  if (frequentPairs.length > 0) {
    insights.push(
      `가장 자주 함께 판매되는 상품: "${frequentPairs[0].productAName}" + "${frequentPairs[0].productBName}" (${frequentPairs[0].count}회)`
    );
  }
  if (rules.filter((r) => r.lift >= 2).length > 0) {
    insights.push(
      `Lift 2x 이상 강한 연관 상품이 ${rules.filter((r) => r.lift >= 2).length}쌍 발견됨 — 번들 판매 추천`
    );
  }

  return { rules: rules.slice(0, 20), frequentPairs: frequentPairs.slice(0, 15), totalOrders, insights };
}

// ============================================================================
// 4. SUPPLIER PERFORMANCE ANALYSIS
// ============================================================================

export type SupplierGrade = "A" | "B" | "C" | "D" | "F";

export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  deliveredOrders: number;
  avgLeadTimeDays: number;
  leadTimeStdDev: number;
  onTimeRate: number; // 0-1
  priceStability: number; // 0-1 (1 = perfectly stable)
  overallScore: number; // 0-100
  grade: SupplierGrade;
  recommendation: string;
}

export interface SupplierPerformanceResult {
  suppliers: SupplierScore[];
  avgScore: number;
  bestSupplierId: string | null;
  worstSupplierId: string | null;
}

interface SupplierOrderData {
  supplierId: string;
  supplierName: string;
  orderDate: string;
  deliveredDate: string | null;
  status: string;
  totalAmount: number;
}

export function analyzeSupplierPerformance(
  supplierOrders: SupplierOrderData[]
): SupplierPerformanceResult {
  if (supplierOrders.length === 0) {
    return { suppliers: [], avgScore: 0, bestSupplierId: null, worstSupplierId: null };
  }

  // Group by supplier
  const supplierMap = new Map<
    string,
    { name: string; orders: SupplierOrderData[] }
  >();

  for (const o of supplierOrders) {
    if (!supplierMap.has(o.supplierId)) {
      supplierMap.set(o.supplierId, { name: o.supplierName, orders: [] });
    }
    supplierMap.get(o.supplierId)!.orders.push(o);
  }

  const suppliers: SupplierScore[] = [];

  for (const [supplierId, { name, orders }] of supplierMap) {
    const totalOrders = orders.length;

    // Lead time: order_date → delivered_date
    const delivered = orders.filter((o) => o.deliveredDate && o.status === "delivered");
    const deliveredOrders = delivered.length;

    const leadTimes = delivered.map((o) => {
      const orderDate = new Date(o.orderDate).getTime();
      const deliverDate = new Date(o.deliveredDate!).getTime();
      return Math.max(0, (deliverDate - orderDate) / (1000 * 60 * 60 * 24));
    });

    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length
      : 0;
    const leadTimeStdDev = calcStdDev(leadTimes);

    // On-time rate: delivered within 14 days (standard lead time)
    const expectedLeadTime = 14;
    const onTimeCount = leadTimes.filter((lt) => lt <= expectedLeadTime).length;
    const onTimeRate = deliveredOrders > 0 ? onTimeCount / deliveredOrders : 0;

    // Price stability: 1 - CV of order amounts
    const amounts = orders.map((o) => o.totalAmount).filter((a) => a > 0);
    const priceCV = calcCV(amounts);
    const priceStability = Math.max(0, Math.min(1, 1 - priceCV));

    // Overall score (weighted)
    // On-time delivery: 40%, Lead time consistency: 25%, Price stability: 20%, Fulfillment rate: 15%
    const fulfillmentRate = totalOrders > 0 ? deliveredOrders / totalOrders : 0;
    const leadTimeScore =
      avgLeadTime > 0
        ? Math.max(0, 100 - (avgLeadTime / expectedLeadTime) * 50)
        : 50;
    const consistencyScore = Math.max(0, 100 - leadTimeStdDev * 10);

    const overallScore = Math.round(
      onTimeRate * 100 * 0.4 +
        Math.min(100, leadTimeScore) * 0.25 +
        priceStability * 100 * 0.2 +
        fulfillmentRate * 100 * 0.15
    );

    const grade = scoreToGrade(overallScore);

    suppliers.push({
      supplierId,
      supplierName: name,
      totalOrders,
      deliveredOrders,
      avgLeadTimeDays: round2(avgLeadTime),
      leadTimeStdDev: round2(leadTimeStdDev),
      onTimeRate: round2(onTimeRate),
      priceStability: round2(priceStability),
      overallScore,
      grade,
      recommendation: getSupplierRecommendation(grade, onTimeRate, priceStability),
    });
  }

  suppliers.sort((a, b) => b.overallScore - a.overallScore);

  const avgScore =
    suppliers.length > 0
      ? Math.round(suppliers.reduce((s, sup) => s + sup.overallScore, 0) / suppliers.length)
      : 0;

  return {
    suppliers,
    avgScore,
    bestSupplierId: suppliers.length > 0 ? suppliers[0].supplierId : null,
    worstSupplierId:
      suppliers.length > 0 ? suppliers[suppliers.length - 1].supplierId : null,
  };
}

function getSupplierRecommendation(
  grade: SupplierGrade,
  onTimeRate: number,
  priceStability: number
): string {
  if (grade === "A") return "우수 공급업체 — 주력 거래처로 유지";
  if (grade === "B") return "양호 — 안정적 거래 관계 지속";
  if (onTimeRate < 0.7) return "납기 지연 빈번 — 대체 공급처 확보 권장";
  if (priceStability < 0.5) return "가격 변동 큼 — 장기 계약 또는 가격 협상 필요";
  if (grade === "D" || grade === "F") return "성과 부진 — 거래 축소 또는 대체 검토";
  return "보통 — 정기 성과 모니터링 권장";
}

// ============================================================================
// 5. WHAT-IF SIMULATION DATA
// ============================================================================

export interface WhatIfProduct {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  avgDailyDemand: number;
  demandStdDev: number;
  costPrice: number;
  unitPrice: number;
  currentSafetyStock: number;
  currentReorderPoint: number;
  leadTimeDays: number;
  daysUntilStockout: number | null;
}

export interface WhatIfBaseData {
  products: WhatIfProduct[];
  totalInventoryValue: number;
  totalDailyCost: number;
}

export function buildWhatIfData(
  inventory: ProductInventoryData[],
  orders: OrderHistoryData[]
): WhatIfBaseData {
  const monthlyMap = buildMonthlySeriesMap(orders, 12);
  const leadTimeDays = 14;
  const z = 1.645;

  const products: WhatIfProduct[] = [];
  let totalInventoryValue = 0;
  let totalDailyCost = 0;

  for (const p of inventory) {
    const monthly = monthlyMap.get(p.productId) ?? [];
    const monthlyAvg = monthly.length > 0
      ? monthly.reduce((s, v) => s + v, 0) / monthly.length
      : 0;
    const avgDailyDemand = monthlyAvg / 30;
    const monthlyStdDev = calcStdDev(monthly);
    const dailyStdDev = monthlyStdDev / 30;

    if (avgDailyDemand <= 0 && p.quantity <= 0) continue;

    const safetyStock = Math.ceil(z * dailyStdDev * Math.sqrt(leadTimeDays));
    const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
    const daysUntilStockout =
      avgDailyDemand > 0 ? Math.round(p.quantity / avgDailyDemand) : null;

    products.push({
      productId: p.productId,
      productName: p.productName,
      sku: p.sku,
      currentStock: p.quantity,
      avgDailyDemand: round2(avgDailyDemand),
      demandStdDev: round2(dailyStdDev),
      costPrice: p.costPrice,
      unitPrice: p.unitPrice,
      currentSafetyStock: safetyStock,
      currentReorderPoint: reorderPoint,
      leadTimeDays,
      daysUntilStockout,
    });

    totalInventoryValue += p.quantity * p.costPrice;
    totalDailyCost += avgDailyDemand * p.costPrice;
  }

  return { products, totalInventoryValue, totalDailyCost };
}

// Client-side what-if calculation (exported for use in client component)
export function computeWhatIf(
  product: WhatIfProduct,
  demandMultiplier: number,
  leadTimeMultiplier: number
) {
  const z = 1.645;
  const newDailyDemand = product.avgDailyDemand * demandMultiplier;
  const newStdDev = product.demandStdDev * demandMultiplier;
  const newLeadTime = product.leadTimeDays * leadTimeMultiplier;

  const newSafetyStock = Math.ceil(z * newStdDev * Math.sqrt(newLeadTime));
  const newReorderPoint = Math.ceil(newDailyDemand * newLeadTime + newSafetyStock);
  const newDaysUntilStockout =
    newDailyDemand > 0
      ? Math.round(product.currentStock / newDailyDemand)
      : null;

  return {
    safetyStock: newSafetyStock,
    reorderPoint: newReorderPoint,
    daysUntilStockout: newDaysUntilStockout,
    dailyDemand: round2(newDailyDemand),
    safetyStockDelta: newSafetyStock - product.currentSafetyStock,
    reorderPointDelta: newReorderPoint - product.currentReorderPoint,
    stockoutDelta:
      newDaysUntilStockout !== null && product.daysUntilStockout !== null
        ? newDaysUntilStockout - product.daysUntilStockout
        : null,
  };
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

function buildMonthlySeriesMap(
  orders: OrderHistoryData[],
  months: number
): Map<string, number[]> {
  const now = new Date();
  const result = new Map<string, Map<string, number>>();

  // Initialize month keys
  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  for (const o of orders) {
    if (o.orderType !== "sale") continue;
    const monthKey = o.orderDate.substring(0, 7);
    if (!monthKeys.includes(monthKey)) continue;

    if (!result.has(o.productId)) {
      result.set(o.productId, new Map(monthKeys.map((k) => [k, 0])));
    }
    const pm = result.get(o.productId)!;
    pm.set(monthKey, (pm.get(monthKey) ?? 0) + o.quantity);
  }

  // Convert to arrays
  const arrayResult = new Map<string, number[]>();
  for (const [pid, monthMap] of result) {
    arrayResult.set(
      pid,
      monthKeys.map((k) => monthMap.get(k) ?? 0)
    );
  }
  return arrayResult;
}

function calcCV(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const stdDev = calcStdDev(values);
  return stdDev / mean;
}

function calcCV2(values: number[]): number {
  const cv = calcCV(values);
  return cv * cv;
}

function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcMAPE(actual: number[], fitted: number[]): number {
  let totalError = 0;
  let count = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] > 0) {
      totalError += Math.abs((actual[i] - (fitted[i] ?? 0)) / actual[i]);
      count++;
    }
  }
  return count > 0 ? (totalError / count) * 100 : 100;
}

// Box-Muller transform for normal random
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function scoreToGrade(score: number): SupplierGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
