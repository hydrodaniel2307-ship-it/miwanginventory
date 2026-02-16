import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";

// Single update item schema (Zod v4 API)
const updateItemSchema = z.object({
  id: z.string().uuid("잘못된 셀 ID 형식입니다."),
  pos_x: z.number().optional(),
  pos_y: z.number().optional(),
  pos_z: z.number().optional(),
  width: z.number().min(0.1).max(10).optional(),
  height: z.number().min(0.1).max(10).optional(),
  depth: z.number().min(0.1).max(10).optional(),
}).refine((data) => {
  const { id: _id, ...updates } = data;
  return Object.keys(updates).length > 0;
}, "최소 하나 이상의 필드를 업데이트해야 합니다.");

// Batch update body schema
const batchUpdateSchema = z.object({
  updates: z.array(updateItemSchema).min(1, "최소 하나 이상의 업데이트가 필요합니다.").max(50, "한 번에 최대 50개까지만 업데이트할 수 있습니다."),
});

/**
 * PATCH /api/warehouse-cells/batch
 * Batch update multiple warehouse cells
 * Requires admin role
 * Body: { updates: [{ id, pos_x?, pos_y?, pos_z?, width?, height?, depth? }] }
 */
export async function PATCH(request: NextRequest) {
  // Auth check - admin only
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

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
  const parsed = batchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { updates } = parsed.data;
  const cellIds = updates.map((u) => u.id);

  // Verify all cells exist and belong to org
  const supabase = createClient();
  const { data: existingCells, error: fetchError } = await supabase
    .from("warehouse_cells")
    .select("id")
    .eq("org_id", context.orgId)
    .in("id", cellIds);

  if (fetchError) {
    console.error("[warehouse-cells/batch] fetch failed", fetchError);
    return NextResponse.json(
      { error: "셀 정보를 확인하지 못했습니다." },
      { status: 500 }
    );
  }

  const existingIds = new Set(existingCells.map((c) => c.id));
  const missingIds = cellIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    return NextResponse.json(
      {
        error: "일부 셀을 찾을 수 없습니다.",
        details: { missingIds }
      },
      { status: 404 }
    );
  }

  // Perform batch update
  // Since Supabase doesn't support batch updates with different values per row,
  // we'll perform updates in parallel using Promise.all
  const updatePromises = updates.map(async ({ id, ...fields }) => {
    const { error } = await supabase
      .from("warehouse_cells")
      .update({
        ...fields,
        updated_by: context.session.id,
      })
      .eq("id", id)
      .eq("org_id", context.orgId);

    if (error) {
      console.error(`[warehouse-cells/batch] update failed for ${id}`, error);
      throw error;
    }

    return id;
  });

  try {
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("[warehouse-cells/batch] batch update failed", error);
    return NextResponse.json(
      { error: "일부 셀 업데이트가 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      updated: updates.length
    }
  });
}
