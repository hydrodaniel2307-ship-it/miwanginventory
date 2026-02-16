import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { getOrgContext, isAdminRole } from "@/lib/org-context";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type UpdatePayload = {
  name?: string;
  sku?: string;
  units_per_box?: number;
  active?: boolean;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const context = await getOrgContext();
  if (!context) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isAdminRole(context.session.role)) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "제품 ID가 필요합니다." }, { status: 400 });
  }

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};

  if (typeof payload.name === "string") {
    const name = payload.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "제품명은 빈 값일 수 없습니다." },
        { status: 400 }
      );
    }
    update.name = name;
  }

  if (typeof payload.sku === "string") {
    const sku = payload.sku.trim();
    if (!sku) {
      return NextResponse.json(
        { error: "SKU는 빈 값일 수 없습니다." },
        { status: 400 }
      );
    }
    update.sku = sku;
  }

  if (payload.units_per_box !== undefined) {
    const unitsPerBox = Number(payload.units_per_box);
    if (!Number.isInteger(unitsPerBox) || unitsPerBox <= 0) {
      return NextResponse.json(
        { error: "박스당 입수는 1 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }
    update.units_per_box = unitsPerBox;
  }

  if (payload.active !== undefined) {
    update.active = Boolean(payload.active);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 값이 없습니다." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .select("id, name, sku, units_per_box, active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 SKU입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
