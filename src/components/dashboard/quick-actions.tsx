"use client";

import Link from "next/link";
import {
  Plus,
  ScanLine,
  ArrowDownToLine,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const actions = [
  {
    label: "상품 추가",
    desc: "새 상품 등록",
    icon: Plus,
    href: "/products",
    accent: "bg-primary/8 text-primary dark:bg-primary/15",
  },
  {
    label: "바코드 스캔",
    desc: "입출고 스캔",
    icon: ScanLine,
    href: "/scan",
    accent:
      "bg-emerald-500/8 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  {
    label: "입고 등록",
    desc: "재고 입고 처리",
    icon: ArrowDownToLine,
    href: "/inventory",
    accent:
      "bg-blue-500/8 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  },
  {
    label: "리포트",
    desc: "운영 현황 확인",
    icon: BarChart3,
    href: "/dashboard",
    accent:
      "bg-orange-500/8 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  },
];

export function QuickActions() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">빠른 작업</CardTitle>
        <CardDescription className="text-[13px]">
          자주 사용하는 기능
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group relative flex flex-col items-center gap-3 rounded-xl border border-border/60 p-5 text-center transition-all duration-300 hover:bg-accent/50 hover:border-border hover:shadow-sm"
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-xl ${action.accent} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {action.desc}
                  </p>
                </div>
                <ArrowRight className="absolute top-3 right-3 size-3.5 text-muted-foreground/0 transition-all duration-300 group-hover:text-muted-foreground/50 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
