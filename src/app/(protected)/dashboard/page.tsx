import {
  getDashboardStats,
  getInventoryChartData,
  getCategoryChartData,
  getRecentActivity,
} from "./actions";
import { getProductPredictions } from "./prediction-actions";
import { getSession } from "@/lib/auth";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { InventoryChart } from "@/components/dashboard/inventory-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PredictionPanel } from "@/components/dashboard/prediction-panel";

export default async function DashboardPage() {
  const [stats, session, chartData, categoryData, activityData, predictions] =
    await Promise.all([
      getDashboardStats(),
      getSession(),
      getInventoryChartData(),
      getCategoryChartData(),
      getRecentActivity(),
      getProductPredictions(),
    ]);

  const greeting = getGreeting();
  const dateStr = formatDate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up stagger-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting},{" "}
            <span className="text-primary">{session?.id ?? "사용자"}</span>님
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            창고 현황을 한눈에 확인하세요
          </p>
        </div>
        <time className="text-[12px] font-medium text-muted-foreground/60 tracking-wide">
          {dateStr}
        </time>
      </div>

      {/* KPI */}
      <KpiCards stats={stats} />

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-5 animate-fade-in-up stagger-3">
        <div className="lg:col-span-3">
          <InventoryChart data={chartData} />
        </div>
        <div className="lg:col-span-2">
          <CategoryChart data={categoryData} />
        </div>
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-5 animate-fade-in-up stagger-4">
        <div className="lg:col-span-3">
          <ActivityFeed activities={activityData} />
        </div>
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
      </div>

      {/* Predictions */}
      <div className="animate-fade-in-up stagger-5">
        <PredictionPanel predictions={predictions} />
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후에요";
  return "좋은 저녁이에요";
}

function formatDate() {
  const now = new Date();
  return now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}
