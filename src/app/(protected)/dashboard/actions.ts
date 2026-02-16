"use server";

import { createClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  todayTransactions: number;
  totalInventoryValue: string;
}

export interface InventoryChartItem {
  month: string;
  inbound: number;
  outbound: number;
}

export interface CategoryChartItem {
  category: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  details: string;
  timestamp: string; // ISO string (serializable for server→client)
  type: "stock" | "order" | "alert" | "product" | "shipped";
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();
  const session = await getSession();
  const isManager = session?.role === "Manager";

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [productsRes, inventoryRows, todayOrdersRes, inventoryValueRes] =
    await Promise.all([
      // Total products count
      supabase.from("products").select("*", { count: "exact", head: true }),

      // All inventory rows for low-stock comparison (column vs column)
      supabase.from("inventory").select("quantity, min_quantity"),

      // Today's transactions (orders created today)
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("order_date", today)
        .lt("order_date", tomorrow),

      // Inventory with product cost for value calculation
      supabase
        .from("inventory")
        .select("quantity, products(cost_price)"),
    ]);

  // Calculate total products
  const totalProducts = productsRes.count ?? 0;

  // Calculate low stock by comparing quantity < min_quantity in JS
  // (Supabase REST API doesn't support column-to-column comparisons)
  const lowStockCount = inventoryRows.data
    ? inventoryRows.data.filter(
        (row) =>
          row.quantity != null &&
          row.min_quantity != null &&
          row.quantity < row.min_quantity
      ).length
    : 0;

  // Calculate today's transactions
  const todayTransactions = todayOrdersRes.count ?? 0;

  // Calculate total inventory value
  let totalValue = 0;
  if (inventoryValueRes.data) {
    for (const row of inventoryValueRes.data) {
      const qty = row.quantity ?? 0;
      // products is a joined object (single relation due to product_id being unique FK)
      const product = row.products as unknown as { cost_price: number } | null;
      const costPrice = product?.cost_price ?? 0;
      totalValue += qty * costPrice;
    }
  }

  const formattedValue = isManager
    ? "--"
    : `₩${Math.round(totalValue).toLocaleString("ko-KR")}`;

  return {
    totalProducts,
    lowStockCount,
    todayTransactions,
    totalInventoryValue: formattedValue,
  };
}

export async function getInventoryChartData(): Promise<InventoryChartItem[]> {
  const supabase = createClient();

  // Get the last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];

  // Fetch orders with their items for the last 6 months
  const { data: orders } = await supabase
    .from("orders")
    .select("order_date, type, order_items(quantity)")
    .gte("order_date", startDate)
    .order("order_date", { ascending: true });

  // Build a map of month -> { inbound, outbound }
  const monthMap = new Map<string, { inbound: number; outbound: number }>();

  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(monthKey, { inbound: 0, outbound: 0 });
  }

  if (orders) {
    for (const order of orders) {
      const orderDate = new Date(order.order_date);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(monthKey)) continue;

      const entry = monthMap.get(monthKey)!;
      const items = order.order_items as unknown as { quantity: number }[];
      const totalQty = items
        ? items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
        : 0;

      if (order.type === "purchase") {
        entry.inbound += totalQty;
      } else if (order.type === "sale") {
        entry.outbound += totalQty;
      }
    }
  }

  // Convert to array with Korean month labels
  const result: InventoryChartItem[] = [];
  for (const [key, value] of monthMap) {
    const [, monthStr] = key.split("-");
    const monthNum = parseInt(monthStr, 10);
    result.push({
      month: `${monthNum}월`,
      inbound: value.inbound,
      outbound: value.outbound,
    });
  }

  return result;
}

export async function getCategoryChartData(): Promise<CategoryChartItem[]> {
  const supabase = createClient();

  // Join inventory -> products -> categories to get quantities by category
  const { data } = await supabase
    .from("inventory")
    .select("quantity, products(category_id, categories(name))");

  if (!data || data.length === 0) return [];

  // Aggregate by category name
  const categoryMap = new Map<string, number>();

  for (const row of data) {
    const qty = row.quantity ?? 0;
    const product = row.products as unknown as {
      category_id: string | null;
      categories: { name: string } | null;
    } | null;

    const categoryName = product?.categories?.name ?? "미분류";
    categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + qty);
  }

  // Convert to sorted array (descending by count)
  const result: CategoryChartItem[] = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return result;
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const supabase = createClient();
  const session = await getSession();
  const isManager = session?.role === "Manager";

  // Query recent orders (last 10, ordered by created_at DESC)
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, type, status, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (orders && orders.length > 0) {
    return orders.map((order) => {
      let action: string;
      let type: ActivityItem["type"];

      if (order.type === "purchase") {
        switch (order.status) {
          case "delivered":
            action = "입고 완료";
            type = "order";
            break;
          case "pending":
            action = "발주 등록";
            type = "order";
            break;
          case "cancelled":
            action = "발주 취소";
            type = "alert";
            break;
          default:
            action = "발주 처리중";
            type = "order";
        }
      } else {
        // sale
        switch (order.status) {
          case "delivered":
            action = "출고 완료";
            type = "shipped";
            break;
          case "pending":
            action = "출고 요청";
            type = "shipped";
            break;
          case "cancelled":
            action = "출고 취소";
            type = "alert";
            break;
          default:
            action = "출고 처리중";
            type = "shipped";
        }
      }

      const amount =
        !isManager && order.total_amount
          ? ` (₩${Math.round(order.total_amount).toLocaleString("ko-KR")})`
          : "";

      return {
        id: order.id,
        action,
        details: `주문번호 ${order.order_number}${amount}`,
        timestamp: order.created_at,
        type,
      };
    });
  }

  // Fallback: if no orders exist, query recent products
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (products && products.length > 0) {
    return products.map((product) => ({
      id: product.id,
      action: "상품 등록",
      details: `${product.name} (${product.sku})`,
      timestamp: product.created_at,
      type: "product" as const,
    }));
  }

  return [];
}
