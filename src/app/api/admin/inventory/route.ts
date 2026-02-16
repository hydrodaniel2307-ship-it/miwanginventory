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
    .trim()
    .optional(),
  cell_id: z.string().uuid({ message: "셀 ID가 올바르지 않습니다." }).optional(),
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
}).refine((data) => data.location_code || data.cell_id, {
  message: "location_code 또는 cell_id 중 하나는 필수입니다.",
  path: ["location_code"],
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
  const { context } = auth;

  const supabase = createClient();
  const locationCodeFilter = request.nextUrl.searchParams.get("location_code");
  const cellIdFilter = request.nextUrl.searchParams.get("cell_id");

  const canonicalFilter = locationCodeFilter
    ? normalizeLocationCode(locationCodeFilter.trim())
    : null;

  if (locationCodeFilter && !canonicalFilter) {
    return NextResponse.json(
      { error: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2)." },
      { status: 400 }
    );
  }

  // Build query — no embedded join (avoids PostgREST schema cache issues)
  let query = supabase
    .from("inventory")
    .select(
      `
      id,
      quantity,
      min_quantity,
      location,
      cell_id,
      created_at,
      updated_at,
      products(id, name, sku, unit_price, cost_price, image_url)
    `
    )
    .eq("org_id", context.orgId);

  // Apply cell_id filter (preferred)
  if (cellIdFilter) {
    query = query.eq("cell_id", cellIdFilter);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Batch-resolve cell codes for all rows with cell_id
  const cellIds = [...new Set((data ?? []).map((r) => r.cell_id).filter(Boolean))] as string[];
  const cellCodeMap = new Map<string, string>();
  if (cellIds.length > 0) {
    const { data: cells } = await supabase
      .from("warehouse_cells")
      .select("id, code")
      .in("id", cellIds);
    for (const c of cells ?? []) {
      if (c.code) cellCodeMap.set(c.id, c.code);
    }
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
        cell_id: row.cell_id ?? null,
        cell_code: row.cell_id ? (cellCodeMap.get(row.cell_id) ?? null) : null,
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
  let { location_code, cell_id } = parsed.data;

  const supabase = createClient();

  // 1) Validate product exists
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, sku")
    .eq("id", product_id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (productError || !product) {
    return NextResponse.json(
      { error: "제품을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 2) Resolve cell_id from location_code if needed
  let resolvedCellId = cell_id;
  let resolvedLocationCode: string | null = null;

  if (location_code && !cell_id) {
    // Normalize and validate location code
    const normalized = normalizeLocationCode(location_code);
    if (!normalized) {
      return NextResponse.json(
        { error: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2)." },
        { status: 400 }
      );
    }
    resolvedLocationCode = normalized;

    // Look up existing cell
    const { data: existingCell } = await supabase
      .from("warehouse_cells")
      .select("id, code")
      .eq("org_id", context.orgId)
      .eq("code", normalized)
      .maybeSingle();

    if (existingCell) {
      resolvedCellId = existingCell.id;
    } else {
      // Auto-create cell from location code
      const match = normalized.match(/^F(\d{2})-B(\d{2})-L(\d{1,2})$/);
      if (match) {
        const face_no = parseInt(match[1], 10);
        const bay_no = parseInt(match[2], 10);
        const level_no = parseInt(match[3], 10);

        const { data: newCell, error: cellError } = await supabase
          .from("warehouse_cells")
          .insert({
            org_id: context.orgId,
            code: normalized,
            face_no,
            bay_no,
            level_no,
            pos_x: bay_no,
            pos_y: level_no,
            pos_z: face_no,
            width: 1.0,
            height: 0.8,
            depth: 1.2,
            cell_type: "shelf",
            capacity: 100,
            created_by: context.session.id,
          })
          .select("id")
          .single();

        if (cellError || !newCell) {
          return NextResponse.json(
            { error: "셀 생성에 실패했습니다." },
            { status: 500 }
          );
        }

        resolvedCellId = newCell.id;
      }
    }
  } else if (cell_id) {
    // Validate cell exists
    const { data: existingCell, error: cellError } = await supabase
      .from("warehouse_cells")
      .select("id, code")
      .eq("id", cell_id)
      .eq("org_id", context.orgId)
      .maybeSingle();

    if (cellError || !existingCell) {
      return NextResponse.json(
        { error: "유효한 셀을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    resolvedLocationCode = existingCell.code ?? null;
  }

  // 3) Upsert-like behavior by product_id
  const { data: existing, error: existingError } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("product_id", product_id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const isUpdate = !!existing;
  const previousQuantity = existing?.quantity ?? 0;

  if (isUpdate) {
    // Update existing inventory
    const { data: updated, error: updateError } = await supabase
      .from("inventory")
      .update({
        location: resolvedLocationCode,
        cell_id: resolvedCellId,
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
        cell_id,
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

    // Create movement record for ADJUST
    if (resolvedCellId) {
      const quantityDelta = quantity - previousQuantity;
      await supabase.from("inventory_movements").insert({
        org_id: context.orgId,
        item_id: updated.id,
        to_cell_id: resolvedCellId,
        quantity: Math.abs(quantityDelta),
        movement_type: "ADJUST",
        reason: quantityDelta > 0 ? "재고 증가" : "재고 감소",
        user_id: context.session.id,
      });
    }

    const productData = updated.products as unknown as {
      id: string;
      name: string;
      sku: string;
      unit_price: number;
      cost_price: number;
      image_url: string | null;
    } | null;

    // Resolve cell code from already-known values
    const updatedCellCode = resolvedLocationCode ?? null;

    return NextResponse.json(
      {
        data: {
          id: updated.id,
          quantity: updated.quantity,
          min_quantity: updated.min_quantity,
          location_code: normalizeLocationCode(updated.location ?? ""),
          cell_id: updated.cell_id ?? null,
          cell_code: updatedCellCode,
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

  // Create new inventory
  const { data: created, error: createError } = await supabase
    .from("inventory")
    .insert({
      org_id: context.orgId,
      product_id,
      location: resolvedLocationCode,
      cell_id: resolvedCellId,
      quantity,
      min_quantity,
    })
    .select(
      `
      id,
      quantity,
      min_quantity,
      location,
      cell_id,
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

  // Create movement record for PUTAWAY
  if (resolvedCellId) {
    await supabase.from("inventory_movements").insert({
      org_id: context.orgId,
      item_id: created.id,
      to_cell_id: resolvedCellId,
      quantity,
      movement_type: "PUTAWAY",
      reason: "신규 재고 등록",
      user_id: context.session.id,
    });
  }

  const productData = created.products as unknown as {
    id: string;
    name: string;
    sku: string;
    unit_price: number;
    cost_price: number;
    image_url: string | null;
  } | null;

  // Resolve cell code from already-known values
  const createdCellCode = resolvedLocationCode ?? null;

  return NextResponse.json(
    {
      data: {
        id: created.id,
        quantity: created.quantity,
        min_quantity: created.min_quantity,
        location_code: normalizeLocationCode(created.location ?? ""),
        cell_id: created.cell_id ?? null,
        cell_code: createdCellCode,
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
