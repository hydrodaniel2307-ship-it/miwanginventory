import { getAllInsights } from "./actions";
import { InsightsHeader } from "@/components/ai-insights/insights-header";
import { HealthScore } from "@/components/ai-insights/health-score";
import { AbcAnalysis } from "@/components/ai-insights/abc-analysis";
import { SmartReorder } from "@/components/ai-insights/smart-reorder";
import { AnomalyFeed } from "@/components/ai-insights/anomaly-feed";
import { CostOptimizer } from "@/components/ai-insights/cost-optimizer";
import { TurnoverChart } from "@/components/ai-insights/turnover-chart";
import { DemandClassifier } from "@/components/ai-insights/demand-classifier";
import { MonteCarlo } from "@/components/ai-insights/monte-carlo";
import { AssociationRules } from "@/components/ai-insights/association-rules";
import { SupplierPerformance } from "@/components/ai-insights/supplier-performance";
import { WhatIfSimulator } from "@/components/ai-insights/what-if-simulator";

export default async function AiInsightsPage() {
  const data = await getAllInsights();

  return (
    <div className="space-y-8">
      {/* Header + Summary Cards */}
      <InsightsHeader data={data} />

      {/* Health Score + Anomaly Feed */}
      <div className="grid gap-5 lg:grid-cols-5 animate-fade-in-up stagger-2">
        <div className="lg:col-span-2">
          <HealthScore data={data.healthScore} />
        </div>
        <div className="lg:col-span-3">
          <AnomalyFeed data={data.anomalyDetection} />
        </div>
      </div>

      {/* === ADVANCED: Demand Pattern Classification === */}
      <div className="animate-fade-in-up stagger-3">
        <DemandClassifier data={data.demandClassification} />
      </div>

      {/* === ADVANCED: Monte Carlo Simulation === */}
      <div className="animate-fade-in-up stagger-3">
        <MonteCarlo data={data.monteCarlo} />
      </div>

      {/* ABC/XYZ Analysis */}
      <div className="animate-fade-in-up stagger-3">
        <AbcAnalysis data={data.abcAnalysis} />
      </div>

      {/* Smart Reorder + Cost Optimizer */}
      <div className="grid gap-5 lg:grid-cols-2 animate-fade-in-up stagger-4">
        <SmartReorder data={data.smartReorder} />
        <CostOptimizer data={data.costOptimization} />
      </div>

      {/* === ADVANCED: Association Rules + Supplier Performance === */}
      <div className="grid gap-5 lg:grid-cols-2 animate-fade-in-up stagger-4">
        <AssociationRules data={data.associationRules} />
        <SupplierPerformance data={data.supplierPerformance} />
      </div>

      {/* === ADVANCED: What-If Simulator === */}
      <div className="animate-fade-in-up stagger-5">
        <WhatIfSimulator data={data.whatIfData} />
      </div>

      {/* Turnover Analysis */}
      <div className="animate-fade-in-up stagger-5">
        <TurnoverChart data={data.turnoverAnalysis} />
      </div>
    </div>
  );
}
