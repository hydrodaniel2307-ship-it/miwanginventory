import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";
import { getWarehouseLocations } from "@/lib/location-system";
import { toCanonicalLocationCode } from "@/lib/location-aliases";

// Location code format: F01-B03-L2 (Face-Bay-Level)
const LOCATION_CODE_REGEX = /^F\d{2}-B\d{2}-L\d{1,2}$/;

const createInventorySchema = z.object({
  product_id: z.string().uuid({ message: "제품 ID가 올바르지 않습니다." }),
  location_code: z
    .string()
    .regex(LOCATION_CODE_REGEX, {
      message: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2).",
    })
    .trim(),
  quantity: z
    .number()
    .int({ message: "수량은 정수여야 합니다." })
    .min(0, { message: "수량은 0 이상이어야 합니다." }),
  min_quantity: z
    .number()
    .int({ message: "최소 수량은 정수여야 합니다." })
    .min(0, { message: "최소 수량은 0 이상이어야 합니다." })
    .optional()
    .default(0),
});

function normalizeLocationCode(raw: string): string | null {
  const canonical = toCanonicalLocationCode(raw).toUpperCase();
  if (!LOCATION_CODE_REGEX.test(canonical)) return null;
  return canonical;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createClient();
  const locationCodeFilter = request.nextUrl.searchParams.get("location_code");
  const canonicalFilter = locationCodeFilter
    ? normalizeLocationCode(locationCodeFilter.trim())
    : null;

  if (locationCodeFilter && !canonicalFilter) {
    return NextResponse.json(
      { error: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2)." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("inventory")
    .select(
      `
      id,
      quantity,
      min_quantity,
      location,
      created_at,
      updated_at,
      products(id, name, sku, unit_price, cost_price, image_url)
    `
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data ?? [])
    .map((row) => {
      const product = row.products as unknown as {
        id: string;
        name: string;
        sku: string;
        unit_price: number;
        cost_price: number;
        image_url: string | null;
      } | null;

      const normalizedLocation = row.location
        ? normalizeLocationCode(row.location)
        : null;

      return {
        id: row.id,
        quantity: row.quantity,
        min_quantity: row.min_quantity,
        location_code: normalizedLocation,
        created_at: row.created_at,
        updated_at: row.updated_at,
        product: product
          ? {
              id: product.id,
              name: product.name,
              sku: product.sku,
              unit_price: product.unit_price,
              cost_price: product.cost_price,
              image_url: product.image_url,
            }
          : null,
      };
    })
    .filter((row) =>
      canonicalFilter ? row.location_code === canonicalFilter : true
    );

  return NextResponse.json({ data: mapped });
}

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

  const parsed = createInventorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "잘못된 요청입니다.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { product_id, quantity, min_quantity } = parsed.data;
  const location_code = normalizeLocationCode(parsed.data.location_code);
  if (!location_code) {
    return NextResponse.json(
      { error: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2)." },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // 1) Validate product exists
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, sku")
    .eq("id", product_id)
    .maybeSingle();

  if (productError || !product) {
    return NextResponse.json(
      { error: "제품을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 2) Validate that location exists and is active
  const locations = await getWarehouseLocations(context.orgId);
  const location = locations.find(
    (loc) => normalizeLocationCode(loc.code) === location_code && loc.active
  );

  if (!location) {
    return NextResponse.json(
      { error: "유효한 위치를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3) Upsert-like behavior by product_id
  const { data: existing, error: existingError } = await supabase
    .from("inventory")
    .select("id")
    .eq("product_id", product_id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("inventory")
      .update({
        location: location_code,
        quantity,
        min_quantity,
      })
      .eq("id", existing.id)
      .select(
        `
        id,
        quantity,
        min_quantity,
        location,
        created_at,
        updated_at,
        products(id, name, sku, unit_price, cost_price, image_url)
      `
      )
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "재고 업데이트에 실패했습니다." },
        { status: 500 }
      );
    }

    const productData = updated.products as unknown as {
      id: string;
      name: string;
      sku: string;
      unit_price: number;
      cost_price: number;
      image_url: string | null;
    } | null;

    return NextResponse.json(
      {
        data: {
          id: updated.id,
          quantity: updated.quantity,
          min_quantity: updated.min_quantity,
          location_code: normalizeLocationCode(updated.location ?? ""),
          created_at: updated.created_at,
          updated_at: updated.updated_at,
          product: productData
            ? {
                id: productData.id,
                name: productData.name,
                sku: productData.sku,
                unit_price: productData.unit_price,
                cost_price: productData.cost_price,
                image_url: productData.image_url,
              }
            : null,
        },
      },
      { status: 200 }
    );
  }

  const { data: created, error: createError } = await supabase
    .from("inventory")
    .insert({
      product_id,
      location: location_code,
      quantity,
      min_quantity,
    })
    .select(
      `
      id,
      quantity,
      min_quantity,
      location,
      created_at,
      updated_at,
      products(id, name, sku, unit_price, cost_price, image_url)
    `
    )
    .single();

  if (createError || !created) {
    return NextResponse.json(
      { error: createError?.message ?? "재고 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  const productData = created.products as unknown as {
    id: string;
    name: string;
    sku: string;
    unit_price: number;
    cost_price: number;
    image_url: string | null;
  } | null;

  return NextResponse.json(
    {
      data: {
        id: created.id,
        quantity: created.quantity,
        min_quantity: created.min_quantity,
        location_code: normalizeLocationCode(created.location ?? ""),
        created_at: created.created_at,
        updated_at: created.updated_at,
        product: productData
          ? {
              id: productData.id,
              name: productData.name,
              sku: productData.sku,
              unit_price: productData.unit_price,
              cost_price: productData.cost_price,
              image_url: productData.image_url,
            }
          : null,
      },
    },
    { status: 201 }
  );
}
