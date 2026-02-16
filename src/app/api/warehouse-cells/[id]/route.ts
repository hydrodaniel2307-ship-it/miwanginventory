import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";

// PATCH body schema (all fields optional, Zod v4 API)
const updateCellSchema = z.object({
  // Logical position
  face_no: z.number().int().min(1).max(11).optional(),
  bay_no: z.number().int().min(1).max(99).optional(),
  level_no: z.number().int().min(1).max(10).optional(),

  // 3D coordinates
  pos_x: z.number().optional(),
  pos_y: z.number().optional(),
  pos_z: z.number().optional(),

  // Cell dimensions
  width: z.number().min(0.1, "너비는 0.1 이상이어야 합니다.").max(10, "너비는 10 이하여야 합니다.").optional(),
  height: z.number().min(0.1, "높이는 0.1 이상이어야 합니다.").max(10, "높이는 10 이하여야 합니다.").optional(),
  depth: z.number().min(0.1, "깊이는 0.1 이상이어야 합니다.").max(10, "깊이는 10 이하여야 합니다.").optional(),

  // Cell type
  cell_type: z.enum(['shelf', 'cold', 'empty', 'reserved'], {
    message: "셀 타입은 'shelf', 'cold', 'empty', 'reserved' 중 하나여야 합니다."
  }).optional(),

  // Display
  label: z.string().nullable().optional(),
  color: z.string().nullable().optional(),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine((data) => Object.keys(data).length > 0, "최소 하나 이상의 필드를 업데이트해야 합니다.");

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/warehouse-cells/:id
 * Update a warehouse cell
 * Requires admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  // Auth check - admin only
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: "잘못된 셀 ID 형식입니다." },
      { status: 400 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  // Validate request body
  const parsed = updateCellSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const updates = parsed.data;

  // Check if cell exists and belongs to org
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("warehouse_cells")
    .select("id, org_id, face_no, bay_no, level_no")
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "셀을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Check for duplicate logical position if updating position fields
  const hasPositionUpdate = updates.face_no !== undefined || updates.bay_no !== undefined || updates.level_no !== undefined;
  if (hasPositionUpdate) {
    const newFaceNo = updates.face_no ?? existing.face_no;
    const newBayNo = updates.bay_no ?? existing.bay_no;
    const newLevelNo = updates.level_no ?? existing.level_no;

    if (newFaceNo && newBayNo && newLevelNo) {
      const { data: duplicate } = await supabase
        .from("warehouse_cells")
        .select("id")
        .eq("org_id", context.orgId)
        .eq("face_no", newFaceNo)
        .eq("bay_no", newBayNo)
        .eq("level_no", newLevelNo)
        .neq("id", id)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { error: "해당 위치에 이미 다른 셀이 존재합니다." },
          { status: 409 }
        );
      }
    }
  }

  // Update cell
  const { data, error } = await supabase
    .from("warehouse_cells")
    .update({
      ...updates,
      updated_by: context.session.id,
    })
    .eq("id", id)
    .eq("org_id", context.orgId)
    .select()
    .single();

  if (error) {
    console.error("[warehouse-cells] PATCH failed", error);
    return NextResponse.json(
      { error: "창고 셀을 업데이트하지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/warehouse-cells/:id
 * Delete a warehouse cell
 * Requires admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  // Auth check - admin only
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: "잘못된 셀 ID 형식입니다." },
      { status: 400 }
    );
  }

  // Delete cell
  const supabase = createClient();
  const { error } = await supabase
    .from("warehouse_cells")
    .delete()
    .eq("id", id)
    .eq("org_id", context.orgId);

  if (error) {
    console.error("[warehouse-cells] DELETE failed", error);
    return NextResponse.json(
      { error: "창고 셀을 삭제하지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
