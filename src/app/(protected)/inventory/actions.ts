"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase-errors";

export type InventoryRow = {
  id: string;
  quantity: number;
  min_quantity: number;
  location: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    image_url: string | null;
    unit_price: number;
    cost_price: number;
    category: { name: string } | null;
  };
};

export async function getInventoryList(): Promise<InventoryRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory")
    .select(
      "id, quantity, min_quantity, location, products(id, name, sku, image_url, unit_price, cost_price, categories(name))"
    )
    .order("quantity", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const product = row.products as unknown as {
      id: string;
      name: string;
      sku: string;
      image_url: string | null;
      unit_price: number;
      cost_price: number;
      categories: { name: string } | null;
    };

    return {
      id: row.id,
      quantity: row.quantity,
      min_quantity: row.min_quantity,
      location: row.location,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        image_url: product.image_url,
        unit_price: product.unit_price,
        cost_price: product.cost_price,
        category: product.categories,
      },
    };
  });
}

export async function getInventorySummary() {
  const supabase = createClient();

  const { data } = await supabase
    .from("inventory")
    .select("quantity, min_quantity, products(cost_price)");

  if (!data) return { totalItems: 0, lowStockCount: 0, totalValue: "₩0" };

  let totalItems = 0;
  let lowStockCount = 0;
  let totalValue = 0;

  for (const row of data) {
    totalItems++;
    if (row.quantity < row.min_quantity) lowStockCount++;
    const product = row.products as unknown as { cost_price: number } | null;
    totalValue += row.quantity * (product?.cost_price ?? 0);
  }

  return {
    totalItems,
    lowStockCount,
    totalValue: `₩${Math.round(totalValue).toLocaleString("ko-KR")}`,
  };
}

export async function updateInventoryQuantity(id: string, quantity: number) {
  if (quantity < 0) return { error: "수량은 0 이상이어야 합니다" };

  const supabase = createClient();
  const { error } = await supabase
    .from("inventory")
    .update({ quantity })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateMinQuantity(id: string, minQuantity: number) {
  if (minQuantity < 0) return { error: "최소 수량은 0 이상이어야 합니다" };

  const supabase = createClient();
  const { error } = await supabase
    .from("inventory")
    .update({ min_quantity: minQuantity })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { error: null };
}

export async function updateLocation(id: string, location: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("inventory")
    .update({ location: location.trim() || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { error: null };
}

export async function deleteInventoryItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { error: null };
}

export type ProductOption = {
  id: string;
  name: string;
  sku: string;
};

export async function getProductsForSelect(): Promise<ProductOption[]> {
  const supabase = createClient();

  const baseQuery = () =>
    supabase
      .from("products")
      .select("id, name, sku")
      .order("name", { ascending: true });

  let { data, error } = await baseQuery().eq("active", true);

  if (error && isMissingColumnError(error, "products", "active")) {
    const fallback = await baseQuery();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  return data ?? [];
}
