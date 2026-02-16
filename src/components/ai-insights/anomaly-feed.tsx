"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import type { AnomalyDetectionResult, AnomalyItem } from "@/lib/ai-insights";

interface AnomalyFeedProps {
  data: AnomalyDetectionResult;
}

const severityConfig = {
  critical: {
    dot: "bg-destructive",
    border: "border-destructive/20",
    bg: "bg-destructive/5",
  },
  warning: {
    dot: "bg-yellow-500",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/5",
  },
  info: {
    dot: "bg-blue-500",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
  },
};

const typeIcons = {
  demand_spike: TrendingUp,
  demand_drop: TrendingDown,
  cost_change: DollarSign,
  abnormal_pattern: Activity,
};

export function AnomalyFeed({ data }: AnomalyFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">이상 탐지</CardTitle>
            <CardDescription className="text-[13px]">
              Z-score 기반 수요/비용 이상 감지
            </CardDescription>
          </div>
          {data.anomalies.length > 0 && (
            <div className="flex gap-2 text-[11px]">
              {data.criticalCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-destructive" />
                  {data.criticalCount}
                </span>
              )}
              {data.warningCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-yellow-500" />
                  {data.warningCount}
                </span>
              )}
              {data.infoCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-blue-500" />
                  {data.infoCount}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.anomalies.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-3">
              {data.anomalies.map((anomaly, i) => (
                <AnomalyCard key={`${anomaly.productId}-${anomaly.type}-${i}`} anomaly={anomaly} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AnomalyCard({ anomaly }: { anomaly: AnomalyItem }) {
  const config = severityConfig[anomaly.severity];
  const Icon = typeIcons[anomaly.type];

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
      <div className="flex items-start gap-3">
        {/* Severity Dot */}
        <div className="mt-1 shrink-0">
          <span className={`block size-2.5 rounded-full ${config.dot}`} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-[12px] font-medium truncate">
                {anomaly.productName}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {anomaly.detectedAt}
            </span>
          </div>

          {/* Description */}
          <p className="text-[12px] text-foreground/80">
            {anomaly.description}
          </p>

          {/* Suggestion */}
          <p className="text-[11px] text-muted-foreground">
            {anomaly.suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
        <AlertCircle className="size-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium">이상 항목 없음</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        현재 감지된 이상 패턴이 없습니다
      </p>
    </div>
  );
}
