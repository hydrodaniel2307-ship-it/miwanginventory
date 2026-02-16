import {
  LayoutDashboard,
  ScanLine,
  Package,
  Boxes,
  Brain,
  Map,
  Settings,
} from "lucide-react";

export const navItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "스캔", href: "/scan", icon: ScanLine },
  { label: "상품", href: "/products", icon: Package },
  { label: "재고", href: "/inventory", icon: Boxes },
  { label: "AI 인사이트", href: "/ai-insights", icon: Brain },
  { label: "창고맵", href: "/map", icon: Map },
  { label: "설정", href: "/settings", icon: Settings },
] as const;

export const mainNavItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "스캔", href: "/scan", icon: ScanLine },
  { label: "상품", href: "/products", icon: Package },
  { label: "재고", href: "/inventory", icon: Boxes },
  { label: "AI 인사이트", href: "/ai-insights", icon: Brain },
] as const;

export const mgmtNavItems = [
  { label: "창고맵", href: "/map", icon: Map },
  { label: "설정", href: "/settings", icon: Settings },
] as const;
