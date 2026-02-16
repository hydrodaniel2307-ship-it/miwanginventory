import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/admin";
import { toCanonicalLocationCode } from "@/lib/location-aliases";
import { isMissingColumnError } from "@/lib/supabase-errors";

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const auth = await requireAdminOrgContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { context } = auth;

    // Parse query parameter
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim();

    // Return empty result if no search term
    if (!q) {
      return NextResponse.json({ data: [] });
    }

    // Create Supabase admin client
    const supabase = createClient();

    const baseProductQuery = () =>
      supabase
        .from("products")
        .select("id, name, sku")
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(200);

    let { data: products, error: productsError } = await baseProductQuery().eq(
      "org_id",
      context.orgId
    );

    if (productsError && isMissingColumnError(productsError, "products", "org_id")) {
      const fallback = await baseProductQuery();
      products = fallback.data;
      productsError = fallback.error;
    }

    if (productsError) {
      console.error("Product query error:", productsError);
      return NextResponse.json(
        { error: "재고 정보를 조회하는 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const productIds = products.map((p) => p.id);

    const baseInventoryQuery = () =>
      supabase
        .from("inventory")
        .select("product_id, quantity, min_quantity, location")
        .in("product_id", productIds)
        .not("location", "is", null)
        .limit(500);

    let { data: inventoryRows, error: inventoryError } = await baseInventoryQuery().eq(
      "org_id",
      context.orgId
    );

    if (inventoryError && isMissingColumnError(inventoryError, "inventory", "org_id")) {
      const fallback = await baseInventoryQuery();
      inventoryRows = fallback.data;
      inventoryError = fallback.error;
    }

    if (inventoryError) {
      console.error("Inventory query error:", inventoryError);
      return NextResponse.json(
        { error: "재고 정보를 조회하는 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    // Map response to required format
    const results = (inventoryRows || []).map((item) => {
      const product = productMap.get(item.product_id);
      return {
        productName: product?.name ?? "Unknown",
        productSku: product?.sku ?? "",
        locationCode: toCanonicalLocationCode(item.location ?? ""),
        quantity: item.quantity,
        minQuantity: item.min_quantity,
      };
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Unexpected error in item-search:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
