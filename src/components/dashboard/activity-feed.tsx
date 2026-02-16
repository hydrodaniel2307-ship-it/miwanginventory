"use client";

import {
  Package,
  AlertTriangle,
  CheckCircle,
  Plus,
  Send,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActivityItem } from "@/app/(protected)/dashboard/actions";

const iconMap: Record<string, typeof Package> = {
  stock: Package,
  order: CheckCircle,
  alert: AlertTriangle,
  product: Plus,
  shipped: Send,
};

const colorMap: Record<string, string> = {
  stock: "bg-blue-500/8 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  order:
    "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  alert: "bg-destructive/8 text-destructive dark:bg-destructive/15",
  product:
    "bg-purple-500/8 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  shipped:
    "bg-orange-500/8 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">최근 활동</CardTitle>
        <CardDescription className="text-[13px]">
          최근 입출고 내역
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="-mt-1">
            {activities.map((item) => {
              const Icon = iconMap[item.type] ?? Activity;
              const colors =
                colorMap[item.type] ?? "bg-muted text-muted-foreground";
              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3.5 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30 -mx-6 px-6"
                >
                  <div
                    className={`shrink-0 size-9 rounded-xl ${colors} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="size-4" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold truncate">
                        {item.action}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground/60 font-medium">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                      {item.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted mb-3">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium">
              아직 활동 내역이 없습니다
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              입출고 활동이 여기에 표시됩니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
