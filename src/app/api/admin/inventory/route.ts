import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireAdminOrgContext } from "@/lib/org-context";
import { z } from "zod/v4";
import { getWarehouseLocations } from "@/lib/location-system";

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

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const supabase = createClient();
  const locationCodeFilter = request.nextUrl.searchParams.get("location_code");

  // Build base query with joins
  let query = supabase
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
    .eq("org_id", context.orgId)
    .order("updated_at", { ascending: false });

  // Apply location filter if provided
  if (locationCodeFilter) {
    const trimmed = locationCodeFilter.trim();
    if (!LOCATION_CODE_REGEX.test(trimmed)) {
      return NextResponse.json(
        { error: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2)." },
        { status: 400 }
      );
    }
    query = query.eq("location", trimmed);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map the response to include product details
  const mapped = (data ?? []).map((row) => {
    const product = row.products as unknown as {
      id: string;
      name: string;
      sku: string;
      unit_price: number;
      cost_price: number;
      image_url: string | null;
    } | null;

    return {
      id: row.id,
      quantity: row.quantity,
      min_quantity: row.min_quantity,
      location_code: row.location,
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
  });

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

  const { product_id, location_code, quantity, min_quantity } = parsed.data;
  const supabase = createClient();

  // 1. Validate that product exists and belongs to this org
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, sku")
    .eq("id", product_id)
    .eq("org_id", context.orgId)
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { error: "제품을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 2. Validate that location exists and is active
  const locations = await getWarehouseLocations(context.orgId);
  const location = locations.find(
    (loc) => loc.code === location_code && loc.active
  );

  if (!location) {
    return NextResponse.json(
      { error: "유효한 위치를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3. Check if inventory item already exists for this product
  const { data: existing, error: existingError } = await supabase
    .from("inventory")
    .select("id, location, quantity")
    .eq("product_id", product_id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  // 4. If inventory exists, update it; otherwise create new
  if (existing) {
    // Update existing inventory item
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

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
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
    };

    return NextResponse.json(
      {
        data: {
          id: updated.id,
          quantity: updated.quantity,
          min_quantity: updated.min_quantity,
          location_code: updated.location,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
          product: {
            id: productData.id,
            name: productData.name,
            sku: productData.sku,
            unit_price: productData.unit_price,
            cost_price: productData.cost_price,
            image_url: productData.image_url,
          },
        },
      },
      { status: 200 }
    );
  }

  // Create new inventory item
  const { data: created, error: createError } = await supabase
    .from("inventory")
    .insert({
      org_id: context.orgId,
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

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const productData = created.products as unknown as {
    id: string;
    name: string;
    sku: string;
    unit_price: number;
    cost_price: number;
    image_url: string | null;
  };

  return NextResponse.json(
    {
      data: {
        id: created.id,
        quantity: created.quantity,
        min_quantity: created.min_quantity,
        location_code: created.location,
        created_at: created.created_at,
        updated_at: created.updated_at,
        product: {
          id: productData.id,
          name: productData.name,
          sku: productData.sku,
          unit_price: productData.unit_price,
          cost_price: productData.cost_price,
          image_url: productData.image_url,
        },
      },
    },
    { status: 201 }
  );
}
