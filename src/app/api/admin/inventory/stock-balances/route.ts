import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";

/**
 * GET /api/admin/inventory/stock-balances
 * Read from stock_balances view with filters
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const cellCodeFilter = searchParams.get("cell_code");
  const productIdFilter = searchParams.get("product_id");

  let query = supabase
    .from("stock_balances")
    .select("*")
    .eq("org_id", context.orgId)
    .order("product_name", { ascending: true });

  if (cellCodeFilter) {
    query = query.eq("cell_code", cellCodeFilter);
  }

  if (productIdFilter) {
    query = query.eq("product_id", productIdFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[inventory/stock-balances] GET failed", error);
    return NextResponse.json(
      { error: "재고 잔액을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
