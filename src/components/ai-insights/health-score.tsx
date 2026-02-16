"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HealthScoreResult } from "@/lib/ai-insights";

interface HealthScoreProps {
  data: HealthScoreResult;
}

const gradeColors: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-destructive",
};

const gradeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  A: "default",
  B: "default",
  C: "secondary",
  D: "secondary",
  F: "destructive",
};

export function HealthScore({ data }: HealthScoreProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (data.score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">재고 건강도</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Circular Gauge */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={scoreStrokeColor(data.score)}
                transform="rotate(-90 80 80)"
                style={{
                  transition: "stroke-dashoffset 1s ease-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{data.score}</span>
              <Badge variant={gradeBadgeVariant[data.grade]} className="mt-1">
                등급 {data.grade}
              </Badge>
            </div>
          </div>
        </div>

        {/* Component Bars */}
        <div className="space-y-3">
          {data.components.map((comp) => (
            <div key={comp.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium">{comp.label}</span>
                <span className="text-muted-foreground">
                  {comp.score}점{" "}
                  <span className="text-[11px] text-muted-foreground/60">
                    (가중치 {comp.weight}%)
                  </span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(comp.score)}`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                {comp.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function scoreStrokeColor(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-blue-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-yellow-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-destructive";
}
