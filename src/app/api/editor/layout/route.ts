import { NextRequest, NextResponse } from "next/server";
import { sanitizeDecorItem, type DecorItem } from "@/lib/map-layout";
import { createClient } from "@/lib/supabase/admin";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase-errors";

const DEFAULT_WAREHOUSE_ID = "main";
const LEGACY_ORG_ID = process.env.INTERNAL_ORG_ID?.trim() || "miwang-main";
const MAX_ITEMS = 10000;
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;

type LayoutResponse = {
  data: {
    warehouseId: string;
    version: number;
    updatedAt: string | null;
    items: DecorItem[];
  };
};

type LegacyLayoutRow = {
  layout_data: unknown;
  updated_at?: string | null;
};

function parseWarehouseId(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_WAREHOUSE_ID;
  if (value.length > 100) return DEFAULT_WAREHOUSE_ID;
  return value;
}

function parseDecorItems(input: unknown): DecorItem[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_ITEMS) return null;

  const items: DecorItem[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") return null;
    const item = row as Partial<DecorItem>;

    if (
      typeof item.id !== "string" ||
      !item.id ||
      (item.kind !== "box" && item.kind !== "pallet" && item.kind !== "shelf") ||
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.z) ||
      !Number.isFinite(item.width) ||
      !Number.isFinite(item.depth) ||
      !Number.isFinite(item.height) ||
      !Number.isFinite(item.rotationY)
    ) {
      return null;
    }

    items.push(sanitizeDecorItem(item as DecorItem));
  }

  return items;
}

function buildLayoutResponse(
  warehouseId: string,
  version: number,
  updatedAt: string | null,
  items: DecorItem[]
): LayoutResponse {
  return {
    data: {
      warehouseId,
      version,
      updatedAt,
      items,
    },
  };
}

function tableMissingError() {
  return NextResponse.json(
    {
      error:
        "warehouse_map_layouts 테이블이 없습니다. Supabase SQL Editor에서 MVP 레이아웃 마이그레이션을 먼저 실행하세요.",
    },
    { status: 500 }
  );
}

function isLegacyLayoutShapeError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null): boolean {
  if (!error) return false;
  return (
    isMissingColumnError(error, "warehouse_map_layouts", "warehouse_id") ||
    isMissingColumnError(error, "warehouse_map_layouts", "layout_json") ||
    isMissingColumnError(error, "warehouse_map_layouts", "version")
  );
}

async function readLegacyLayout(
  supabase: ReturnType<typeof createClient>,
  warehouseId: string
): Promise<LayoutResponse> {
  let { data, error } = await supabase
    .from("warehouse_map_layouts")
    .select("layout_data, updated_at")
    .eq("org_id", LEGACY_ORG_ID)
    .maybeSingle();

  if (error && isMissingColumnError(error, "warehouse_map_layouts", "org_id")) {
    const fallback = await supabase
      .from("warehouse_map_layouts")
      .select("layout_data, updated_at")
    .limit(1)
    .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  const legacy = data as LegacyLayoutRow | null;
  const items = parseDecorItems(legacy?.layout_data ?? []) ?? [];
  return buildLayoutResponse(warehouseId, 1, legacy?.updated_at ?? null, items);
}

export async function GET(request: NextRequest) {
  const warehouseId = parseWarehouseId(request.nextUrl.searchParams.get("warehouse"));
  const supabase = createClient();

  const { data, error } = await supabase
    .from("warehouse_map_layouts")
    .select("warehouse_id, version, layout_json, updated_at")
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "warehouse_map_layouts")) {
      return tableMissingError();
    }

    if (isLegacyLayoutShapeError(error)) {
      try {
        const legacyPayload = await readLegacyLayout(supabase, warehouseId);
        return NextResponse.json(legacyPayload);
      } catch (legacyError) {
        if (
          isMissingTableError(
            legacyError as { code?: string | null; message?: string | null },
            "warehouse_map_layouts"
          )
        ) {
          return tableMissingError();
        }

        console.error("[editor/layout][GET] legacy read failed", {
          warehouseId,
          error: legacyError,
        });
      }
    }

    console.error("[editor/layout][GET] failed", {
      code: error.code,
      message: error.message,
      warehouseId,
    });

    return NextResponse.json(
      { error: "레이아웃을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const items = parseDecorItems(data?.layout_json ?? []) ?? [];
  return NextResponse.json(
    buildLayoutResponse(
      warehouseId,
      data?.version ?? 1,
      data?.updated_at ?? null,
      items
    )
  );
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  if (bodyText.length > MAX_PAYLOAD_SIZE) {
    return NextResponse.json(
      { error: "요청 본문 크기가 너무 큽니다." },
      { status: 413 }
    );
  }

  let payload: { warehouseId?: unknown; warehouse?: unknown; items?: unknown };
  try {
    payload = JSON.parse(bodyText) as {
      warehouseId?: unknown;
      warehouse?: unknown;
      items?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "요청 본문 JSON 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const warehouseId = parseWarehouseId(
    typeof payload.warehouseId === "string"
      ? payload.warehouseId
      : typeof payload.warehouse === "string"
        ? payload.warehouse
        : DEFAULT_WAREHOUSE_ID
  );

  const items = parseDecorItems(payload.items);
  if (!items) {
    return NextResponse.json(
      { error: "items 배열 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const { data: current, error: readError } = await supabase
    .from("warehouse_map_layouts")
    .select("version")
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (readError) {
    if (isMissingTableError(readError, "warehouse_map_layouts")) {
      return tableMissingError();
    }

    if (isLegacyLayoutShapeError(readError)) {
      const { error: legacyWriteError } = await supabase
        .from("warehouse_map_layouts")
        .upsert(
          {
            org_id: LEGACY_ORG_ID,
            layout_data: items,
            updated_at: now,
          },
          { onConflict: "org_id" }
        );

      if (legacyWriteError) {
        if (isMissingTableError(legacyWriteError, "warehouse_map_layouts")) {
          return tableMissingError();
        }

        console.error("[editor/layout][POST] legacy upsert failed", {
          code: legacyWriteError.code,
          message: legacyWriteError.message,
          warehouseId,
          itemCount: items.length,
        });

        return NextResponse.json(
          { error: "레이아웃 저장에 실패했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        buildLayoutResponse(warehouseId, 1, now, items)
      );
    }

    console.error("[editor/layout][POST] pre-read failed", {
      code: readError.code,
      message: readError.message,
      warehouseId,
    });

    return NextResponse.json(
      { error: "레이아웃 저장 준비 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const nextVersion = Math.max(1, (current?.version ?? 0) + 1);

  const { error: writeError } = await supabase
    .from("warehouse_map_layouts")
    .upsert(
      {
        warehouse_id: warehouseId,
        version: nextVersion,
        layout_json: items,
        updated_at: now,
      },
      { onConflict: "warehouse_id" }
    );

  if (writeError) {
    if (isMissingTableError(writeError, "warehouse_map_layouts")) {
      return tableMissingError();
    }

    console.error("[editor/layout][POST] upsert failed", {
      code: writeError.code,
      message: writeError.message,
      warehouseId,
      itemCount: items.length,
    });

    return NextResponse.json(
      { error: "레이아웃 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    buildLayoutResponse(warehouseId, nextVersion, now, items)
  );
}
