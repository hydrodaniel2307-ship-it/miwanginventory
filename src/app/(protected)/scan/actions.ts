"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/admin";
import { requireOrgContext } from "@/lib/org-context";
import { toCanonicalLocationCode } from "@/lib/location-aliases";
import type { Product, Inventory } from "@/lib/types/database";

export type ScanResult = {
  product: Product;
  inventory: Inventory | null;
  categoryName?: string;
};

async function resolveActionOrgId() {
  const auth = await requireOrgContext();
  if (!auth.ok) return { orgId: null, error: auth.error };
  return { orgId: auth.context.orgId, error: null };
}

export async function lookupBySku(
  sku: string
): Promise<{ data: ScanResult | null; error: string | null }> {
  const { orgId, error: orgError } = await resolveActionOrgId();
  if (!orgId) {
    return { data: null, error: orgError ?? "조직 멤버십이 없습니다." };
  }

  const supabase = createClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("org_id", orgId)
    .eq("sku", sku.trim())
    .single();

  if (productError || !product) {
    return { data: null, error: "상품을 찾을 수 없습니다" };
  }

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*")
    .eq("org_id", orgId)
    .eq("product_id", product.id)
    .single();

  const category = product.categories as unknown as { name: string } | null;

  return {
    data: {
      product: {
        id: product.id,
        org_id: product.org_id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category_id: product.category_id,
        unit_price: product.unit_price,
        cost_price: product.cost_price,
        image_url: product.image_url,
        created_at: product.created_at,
        updated_at: product.updated_at,
      },
      inventory: inventory as Inventory | null,
      categoryName: category?.name,
    },
    error: null,
  };
}

export async function processInbound(
  productId: string,
  quantity: number
): Promise<{ error: string | null }> {
  if (quantity <= 0) return { error: "수량은 1 이상이어야 합니다" };
  const { orgId, error: orgError } = await resolveActionOrgId();
  if (!orgId) return { error: orgError ?? "조직 멤버십이 없습니다." };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("org_id", orgId)
    .eq("product_id", productId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id)
      .eq("org_id", orgId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("inventory").insert({
      org_id: orgId,
      product_id: productId,
      quantity,
      min_quantity: 0,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/scan");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/map");
  return { error: null };
}

export async function processOutbound(
  productId: string,
  quantity: number
): Promise<{ error: string | null }> {
  if (quantity <= 0) return { error: "수량은 1 이상이어야 합니다" };
  const { orgId, error: orgError } = await resolveActionOrgId();
  if (!orgId) return { error: orgError ?? "조직 멤버십이 없습니다." };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("org_id", orgId)
    .eq("product_id", productId)
    .single();

  if (!existing) {
    return { error: "재고 기록이 없습니다" };
  }

  if (existing.quantity < quantity) {
    return {
      error: `재고가 부족합니다 (현재: ${existing.quantity}개)`,
    };
  }

  const { error } = await supabase
    .from("inventory")
    .update({ quantity: existing.quantity - quantity })
    .eq("id", existing.id)
    .eq("org_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/scan");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/map");
  return { error: null };
}

export async function processTransfer(
  productId: string,
  newLocation: string
): Promise<{ error: string | null }> {
  if (!newLocation.trim()) return { error: "위치를 입력해 주세요" };
  const { orgId, error: orgError } = await resolveActionOrgId();
  if (!orgId) return { error: orgError ?? "조직 멤버십이 없습니다." };

  const supabase = createClient();
  let normalizedLocation = toCanonicalLocationCode(newLocation);

  // Canonicalize into official warehouse location code when possible.
  const { data: matchedByCode } = await supabase
    .from("warehouse_locations")
    .select("code")
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("code", normalizedLocation)
    .single();

  if (matchedByCode?.code) {
    normalizedLocation = matchedByCode.code;
  } else {
    const { data: matchedByDisplayName } = await supabase
      .from("warehouse_locations")
      .select("code")
      .eq("org_id", orgId)
      .eq("active", true)
      .eq("display_name", newLocation.trim())
      .single();

    if (matchedByDisplayName?.code) {
      normalizedLocation = matchedByDisplayName.code;
    }
  }

  const { data: existing } = await supabase
    .from("inventory")
    .select("id")
    .eq("org_id", orgId)
    .eq("product_id", productId)
    .single();

  if (!existing) {
    return { error: "재고 기록이 없습니다" };
  }

  const { error } = await supabase
    .from("inventory")
    .update({ location: normalizedLocation })
    .eq("id", existing.id)
    .eq("org_id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/scan");
  revalidatePath("/inventory");
  revalidatePath("/map");
  return { error: null };
}
