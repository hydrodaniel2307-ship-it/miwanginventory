import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";
import { requireOrgContext } from "@/lib/org-context";
import { buildLocationAliases } from "@/lib/location-aliases";
import { getWarehouseLocations } from "@/lib/location-system";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const auth = await requireOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "위치 ID가 필요합니다." }, { status: 400 });
  }

  const locations = await getWarehouseLocations(context.orgId);
  const location = locations.find((row) => row.id === id);

  if (!location) {
    return NextResponse.json(
      { error: "위치를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const aliases = buildLocationAliases(location);
  const supabase = createClient();
  const baseQuery = () =>
    supabase
      .from("inventory")
      .select("id, quantity, min_quantity, location, updated_at, products(id, name, sku)")
      .order("updated_at", { ascending: false });

  const targetLocationCode = aliases[0] ?? location.code;
  const { data: items, error: itemsError } =
    aliases.length <= 1
      ? await baseQuery().eq("location", targetLocationCode)
      : await baseQuery().in("location", aliases);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const mappedItems = (items ?? []).map((row) => {
    const product = row.products as unknown as
      | { id: string; name: string; sku: string }
      | null;
    return {
      id: row.id,
      quantity: row.quantity,
      min_quantity: row.min_quantity,
      updated_at: row.updated_at,
      product,
    };
  });

  return NextResponse.json({
    data: {
      location,
      qr_payload: `LOC:${location.id}`,
      items: mappedItems,
    },
  });
}
