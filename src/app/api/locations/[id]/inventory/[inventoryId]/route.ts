import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { getOrgContext, isAdminRole } from "@/lib/org-context";
import { buildLocationAliases } from "@/lib/location-aliases";
import { getWarehouseLocations } from "@/lib/location-system";

type Params = {
  params: Promise<{
    id: string;
    inventoryId: string;
  }>;
};

type UpdatePayload = {
  quantity?: number;
  min_quantity?: number;
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

  const { id: locationId, inventoryId } = await params;
  if (!locationId || !inventoryId) {
    return NextResponse.json(
      { error: "요청 경로가 올바르지 않습니다." },
      { status: 400 }
    );
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

  const update: Record<string, number | string> = {};

  if (payload.quantity !== undefined) {
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "수량은 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }
    update.quantity = quantity;
  }

  if (payload.min_quantity !== undefined) {
    const minQuantity = Number(payload.min_quantity);
    if (!Number.isInteger(minQuantity) || minQuantity < 0) {
      return NextResponse.json(
        { error: "최소 수량은 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }
    update.min_quantity = minQuantity;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "변경할 값이 없습니다." },
      { status: 400 }
    );
  }

  const locations = await getWarehouseLocations(context.orgId);
  const location = locations.find((row) => row.id === locationId);

  if (!location) {
    return NextResponse.json(
      { error: "위치를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const supabase = createClient();

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("id, location")
    .eq("id", inventoryId)
    .single();

  if (inventoryError || !inventory) {
    return NextResponse.json(
      { error: "재고 항목을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const aliases = buildLocationAliases(location);
  if (!aliases.includes(inventory.location ?? "")) {
    return NextResponse.json(
      { error: "해당 위치에 속한 재고 항목이 아닙니다." },
      { status: 400 }
    );
  }

  update.location = location.code;

  const { data, error } = await supabase
    .from("inventory")
    .update(update)
    .eq("id", inventoryId)
    .select("id, quantity, min_quantity, updated_at, location")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

