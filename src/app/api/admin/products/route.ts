import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";

type CreateProductPayload = {
  name?: string;
  sku?: string;
  units_per_box?: number;
  active?: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, units_per_box, active, created_at, updated_at")
    .eq("org_id", context.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data ?? []).filter((row) => {
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q)
    );
  });

  return NextResponse.json({ data: filtered });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  let payload: CreateProductPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const name = payload.name?.trim();
  const sku = payload.sku?.trim();
  const unitsPerBox = Number(payload.units_per_box);
  const active = payload.active ?? true;

  if (!name) {
    return NextResponse.json({ error: "제품명을 입력해 주세요." }, { status: 400 });
  }
  if (!sku) {
    return NextResponse.json({ error: "SKU를 입력해 주세요." }, { status: 400 });
  }
  if (!Number.isInteger(unitsPerBox) || unitsPerBox <= 0) {
    return NextResponse.json(
      { error: "박스당 입수는 1 이상의 정수여야 합니다." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      org_id: context.orgId,
      name,
      sku,
      units_per_box: unitsPerBox,
      active,
      unit_price: 0,
      cost_price: 0,
    })
    .select("id, name, sku, units_per_box, active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 SKU입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
