"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/admin";
import {
  checkStockAlerts,
  generateReorderSuggestions,
  type StockAlert,
  type ReorderSuggestion,
} from "@/lib/stock-alerts";

export async function getStockAlerts(): Promise<StockAlert[]> {
  return checkStockAlerts();
}

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  return generateReorderSuggestions();
}

/**
 * Generates a unique order number in PO-YYYY-XXXX format.
 */
async function generateOrderNumber(): Promise<string> {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  // Find the latest order number with this prefix
  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .like("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].order_number.replace(prefix, ""), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Creates a purchase order for a single product reorder.
 */
export async function createReorder(
  productId: string,
  quantity: number,
  supplierId?: string
): Promise<{ orderId?: string; orderNumber?: string; error?: string }> {
  if (quantity <= 0) {
    return { error: "발주 수량은 1 이상이어야 합니다" };
  }

  const supabase = createClient();

  // Get product cost price
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, cost_price")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return { error: "상품 정보를 찾을 수 없습니다" };
  }

  const unitPrice = product.cost_price;
  const totalPrice = unitPrice * quantity;
  const orderNumber = await generateOrderNumber();

  // Create the purchase order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      type: "purchase" as const,
      status: "pending" as const,
      supplier_id: supplierId ?? null,
      total_amount: totalPrice,
      notes: `자동 발주 - 재고 부족`,
      order_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: `발주서 생성 실패: ${orderError?.message}` };
  }

  // Create order item
  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    total_price: totalPrice,
  });

  if (itemError) {
    // Rollback order if item creation fails
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: `발주 항목 생성 실패: ${itemError.message}` };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return { orderId: order.id, orderNumber };
}

/**
 * Creates a single purchase order containing multiple reorder items.
 */
export async function batchReorder(
  items: { productId: string; quantity: number }[]
): Promise<{ orderId?: string; orderNumber?: string; error?: string }> {
  if (items.length === 0) {
    return { error: "발주할 항목이 없습니다" };
  }

  const supabase = createClient();

  // Get all product cost prices
  const productIds = items.map((item) => item.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, cost_price")
    .in("id", productIds);

  if (productsError || !products) {
    return { error: "상품 정보를 불러올 수 없습니다" };
  }

  const priceMap = new Map(products.map((p) => [p.id, p.cost_price]));

  // Calculate totals
  let totalAmount = 0;
  const orderItems: {
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[] = [];

  for (const item of items) {
    const unitPrice = priceMap.get(item.productId) ?? 0;
    const itemTotal = unitPrice * item.quantity;
    totalAmount += itemTotal;

    orderItems.push({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: itemTotal,
    });
  }

  const orderNumber = await generateOrderNumber();

  // Create the purchase order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      type: "purchase" as const,
      status: "pending" as const,
      total_amount: totalAmount,
      notes: `일괄 자동 발주 - ${items.length}개 품목 재고 부족`,
      order_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: `발주서 생성 실패: ${orderError?.message}` };
  }

  // Create order items
  const itemsWithOrderId = orderItems.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsWithOrderId);

  if (itemsError) {
    // Rollback order if items creation fails
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: `발주 항목 생성 실패: ${itemsError.message}` };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return { orderId: order.id, orderNumber };
}
