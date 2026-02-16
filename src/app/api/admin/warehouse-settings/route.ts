import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";

// Temperature value schema
const temperatureValueSchema = z.object({
  celsius: z
    .number()
    .min(-20, { message: "온도는 -20°C 이상이어야 합니다." })
    .max(40, { message: "온도는 40°C 이하여야 합니다." }),
});

// GET query params schema
const getQuerySchema = z.object({
  key: z.string().min(1, { message: "key 파라미터가 필요합니다." }),
});

// PATCH body schema
const patchBodySchema = z.object({
  key: z.string().min(1, { message: "key가 필요합니다." }),
  value: temperatureValueSchema,
});

/**
 * GET /api/admin/warehouse-settings?key=temperature
 * Retrieve a warehouse setting by key
 */
export async function GET(request: NextRequest) {
  // Auth check
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  // Parse and validate query params
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = getQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { key } = parsed.data;

  // Fetch setting from database
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouse_settings")
    .select("key, value")
    .eq("org_id", context.orgId)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "설정을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "설정을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: data.value });
}

/**
 * PATCH /api/admin/warehouse-settings
 * Update a warehouse setting
 * Body: { key: "temperature", value: { celsius: 15 } }
 */
export async function PATCH(request: NextRequest) {
  // Auth check
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
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { key, value } = parsed.data;

  // Upsert setting (idempotent operation)
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouse_settings")
    .upsert(
      {
        org_id: context.orgId,
        key,
        value,
        updated_by: context.session.id,
      },
      { onConflict: "org_id,key" }
    )
    .select("key, value, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "설정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data.value });
}
