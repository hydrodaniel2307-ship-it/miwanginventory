import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireOrgContext, requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";

// POST body schema (Zod v4 API)
const createCellSchema = z.object({
  // Logical position (optional)
  face_no: z.number().int().min(1).max(11).optional(),
  bay_no: z.number().int().min(1).max(99).optional(),
  level_no: z.number().int().min(1).max(10).optional(),

  // 3D coordinates (required)
  pos_x: z.number({ message: "X 좌표가 필요합니다." }),
  pos_y: z.number({ message: "Y 좌표가 필요합니다." }),
  pos_z: z.number({ message: "Z 좌표가 필요합니다." }),

  // Cell dimensions (optional with defaults)
  width: z.number().min(0.1, "너비는 0.1 이상이어야 합니다.").max(10, "너비는 10 이하여야 합니다.").default(1.0),
  height: z.number().min(0.1, "높이는 0.1 이상이어야 합니다.").max(10, "높이는 10 이하여야 합니다.").default(0.8),
  depth: z.number().min(0.1, "깊이는 0.1 이상이어야 합니다.").max(10, "깊이는 10 이하여야 합니다.").default(1.2),

  // Cell type
  cell_type: z.enum(['shelf', 'cold', 'empty', 'reserved'], {
    message: "셀 타입은 'shelf', 'cold', 'empty', 'reserved' 중 하나여야 합니다."
  }).default('shelf'),

  // Display
  label: z.string().optional(),
  color: z.string().optional(),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * GET /api/warehouse-cells
 * List all warehouse cells
 * Any authenticated user can read
 */
export async function GET(request: NextRequest) {
  // Auth check - any authenticated user
  const auth = await requireOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouse_cells")
    .select("*")
    .eq("org_id", context.orgId)
    .order("face_no", { ascending: true, nullsFirst: false })
    .order("bay_no", { ascending: true, nullsFirst: false })
    .order("level_no", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[warehouse-cells] GET failed", error);
    return NextResponse.json(
      { error: "창고 셀 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/warehouse-cells
 * Create a new warehouse cell
 * Requires admin role
 */
export async function POST(request: NextRequest) {
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
  const parsed = createCellSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const cellData = parsed.data;

  // Check for duplicate logical position if provided
  if (cellData.face_no && cellData.bay_no && cellData.level_no) {
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("warehouse_cells")
      .select("id")
      .eq("org_id", context.orgId)
      .eq("face_no", cellData.face_no)
      .eq("bay_no", cellData.bay_no)
      .eq("level_no", cellData.level_no)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "해당 위치에 이미 셀이 존재합니다." },
        { status: 409 }
      );
    }
  }

  // Insert new cell
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouse_cells")
    .insert({
      org_id: context.orgId,
      ...cellData,
      created_by: context.session.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[warehouse-cells] POST failed", error);
    return NextResponse.json(
      { error: "창고 셀을 생성하지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
