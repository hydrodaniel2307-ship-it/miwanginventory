import { NextResponse } from "next/server";
import { requireAdminOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/admin";
import { toCanonicalLocationCode } from "@/lib/location-aliases";
import { isMissingColumnError } from "@/lib/supabase-errors";

type InventorySummary = {
  location: string;
  totalQty: number;
  itemCount: number;
  hasLowStock: boolean;
};

export async function GET() {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  try {
    const supabase = createClient();

    const baseQuery = () =>
      supabase
        .from("inventory")
        .select("location, quantity, min_quantity")
        .not("location", "is", null);

    let { data: inventoryRows, error } = await baseQuery().eq(
      "org_id",
      context.orgId
    );

    if (error && isMissingColumnError(error, "inventory", "org_id")) {
      const fallback = await baseQuery();
      inventoryRows = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    // Aggregate by location
    const summaryMap = new Map<string, InventorySummary>();

    for (const row of inventoryRows ?? []) {
      if (!row.location) continue;
      const location = toCanonicalLocationCode(row.location);
      const existing = summaryMap.get(location);
      const quantity = Number(row.quantity ?? 0);
      const minQuantity = Number(row.min_quantity ?? 0);

      const hasLowStock = quantity < minQuantity && minQuantity > 0;

      if (existing) {
        existing.totalQty += quantity;
        existing.itemCount += 1;
        existing.hasLowStock = existing.hasLowStock || hasLowStock;
      } else {
        summaryMap.set(location, {
          location,
          totalQty: quantity,
          itemCount: 1,
          hasLowStock,
        });
      }
    }

    const data = Array.from(summaryMap.values());

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "재고 요약을 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
