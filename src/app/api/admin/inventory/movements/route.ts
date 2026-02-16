import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";

const createMovementSchema = z.object({
  item_id: z.string().uuid({ message: "재고 ID가 올바르지 않습니다." }),
  from_cell_id: z.string().uuid({ message: "출발 셀 ID가 올바르지 않습니다." }).optional(),
  to_cell_id: z.string().uuid({ message: "도착 셀 ID가 올바르지 않습니다." }).optional(),
  quantity: z
    .number()
    .int({ message: "수량은 정수여야 합니다." })
    .min(1, { message: "수량은 1 이상이어야 합니다." }),
  movement_type: z.enum(["PUTAWAY", "PICK", "TRANSFER", "ADJUST"], {
    message: "이동 유형은 PUTAWAY, PICK, TRANSFER, ADJUST 중 하나여야 합니다.",
  }),
  reason: z.string().optional(),
});

/**
 * GET /api/admin/inventory/movements
 * List recent inventory movements with filters
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const itemIdFilter = searchParams.get("item_id");
  const cellIdFilter = searchParams.get("cell_id");
  const movementTypeFilter = searchParams.get("movement_type");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "50", 10),
    200
  );

  let query = supabase
    .from("inventory_movements")
    .select(
      `
      id,
      movement_type,
      quantity,
      reason,
      created_at,
      user_id,
      from_cell_id,
      to_cell_id,
      inventory!inner(id, product_id, products!inner(id, name, sku))
    `
    )
    .eq("org_id", context.orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (itemIdFilter) {
    query = query.eq("item_id", itemIdFilter);
  }

  if (cellIdFilter) {
    query = query.or(`from_cell_id.eq.${cellIdFilter},to_cell_id.eq.${cellIdFilter}`);
  }

  if (movementTypeFilter) {
    query = query.eq("movement_type", movementTypeFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[inventory/movements] GET failed", error);
    return NextResponse.json(
      { error: "이동 기록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  // Fetch cell codes separately for better performance
  const cellIds = new Set<string>();
  (data ?? []).forEach((row) => {
    if (row.from_cell_id) cellIds.add(row.from_cell_id);
    if (row.to_cell_id) cellIds.add(row.to_cell_id);
  });

  const cellMap = new Map<string, string>();
  if (cellIds.size > 0) {
    const { data: cells } = await supabase
      .from("warehouse_cells")
      .select("id, code")
      .in("id", Array.from(cellIds));

    (cells ?? []).forEach((cell) => {
      cellMap.set(cell.id, cell.code ?? "");
    });
  }

  const mapped = (data ?? []).map((row) => {
    const inventory = row.inventory as unknown as {
      id: string;
      product_id: string;
      products: {
        id: string;
        name: string;
        sku: string;
      };
    };

    return {
      id: row.id,
      movement_type: row.movement_type,
      quantity: row.quantity,
      reason: row.reason,
      from_cell_code: row.from_cell_id ? cellMap.get(row.from_cell_id) ?? null : null,
      to_cell_code: row.to_cell_id ? cellMap.get(row.to_cell_id) ?? null : null,
      product_name: inventory.products.name,
      sku: inventory.products.sku,
      user_id: row.user_id,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ data: mapped });
}

/**
 * POST /api/admin/inventory/movements
 * Create a new inventory movement and update inventory accordingly
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const parsed = createMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { item_id, from_cell_id, to_cell_id, quantity, movement_type, reason } = parsed.data;

  const supabase = createClient();

  // 1) Validate inventory item exists
  const { data: inventoryItem, error: itemError } = await supabase
    .from("inventory")
    .select("id, quantity, cell_id")
    .eq("id", item_id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (itemError || !inventoryItem) {
    return NextResponse.json(
      { error: "재고 항목을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 2) Validate cells exist
  if (from_cell_id) {
    const { data: fromCell } = await supabase
      .from("warehouse_cells")
      .select("id")
      .eq("id", from_cell_id)
      .eq("org_id", context.orgId)
      .maybeSingle();

    if (!fromCell) {
      return NextResponse.json(
        { error: "출발 셀을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
  }

  if (to_cell_id) {
    const { data: toCell } = await supabase
      .from("warehouse_cells")
      .select("id, code")
      .eq("id", to_cell_id)
      .eq("org_id", context.orgId)
      .maybeSingle();

    if (!toCell) {
      return NextResponse.json(
        { error: "도착 셀을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
  }

  // 3) Validate movement type logic
  if (movement_type === "TRANSFER" && (!from_cell_id || !to_cell_id)) {
    return NextResponse.json(
      { error: "TRANSFER 이동은 출발 셀과 도착 셀이 모두 필요합니다." },
      { status: 400 }
    );
  }

  if (movement_type === "PICK" && quantity > inventoryItem.quantity) {
    return NextResponse.json(
      { error: "피킹 수량이 재고 수량을 초과할 수 없습니다." },
      { status: 400 }
    );
  }

  // 4) Calculate new quantity
  let newQuantity = inventoryItem.quantity;
  let updatePayload: { quantity?: number; cell_id?: string | null; location?: string | null } = {};

  switch (movement_type) {
    case "PUTAWAY":
      newQuantity += quantity;
      updatePayload.quantity = newQuantity;
      if (to_cell_id) {
        updatePayload.cell_id = to_cell_id;
        // Fetch cell code for location
        const { data: cellData } = await supabase
          .from("warehouse_cells")
          .select("code")
          .eq("id", to_cell_id)
          .single();
        if (cellData?.code) {
          updatePayload.location = cellData.code;
        }
      }
      break;

    case "PICK":
      newQuantity -= quantity;
      updatePayload.quantity = newQuantity;
      break;

    case "TRANSFER":
      if (to_cell_id) {
        updatePayload.cell_id = to_cell_id;
        // Fetch cell code for location
        const { data: cellData } = await supabase
          .from("warehouse_cells")
          .select("code")
          .eq("id", to_cell_id)
          .single();
        if (cellData?.code) {
          updatePayload.location = cellData.code;
        }
      }
      break;

    case "ADJUST":
      updatePayload.quantity = quantity;
      break;
  }

  // 5) Create movement record and update inventory (transactional intent)
  const { data: movement, error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      org_id: context.orgId,
      item_id,
      from_cell_id: from_cell_id ?? null,
      to_cell_id: to_cell_id ?? null,
      quantity,
      movement_type,
      reason: reason ?? null,
      user_id: context.session.id,
    })
    .select()
    .single();

  if (movementError || !movement) {
    return NextResponse.json(
      { error: "이동 기록 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  // 6) Update inventory if needed
  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from("inventory")
      .update(updatePayload)
      .eq("id", item_id);

    if (updateError) {
      // Rollback movement (best effort - ideally use DB transactions)
      await supabase.from("inventory_movements").delete().eq("id", movement.id);

      return NextResponse.json(
        { error: "재고 업데이트에 실패했습니다." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ data: movement }, { status: 201 });
}
