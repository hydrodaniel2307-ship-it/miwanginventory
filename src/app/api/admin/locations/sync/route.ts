import { NextResponse } from "next/server";
import { requireAdminOrgContext } from "@/lib/org-context";
import { syncWarehouseLocations } from "@/lib/location-system";

export async function POST() {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  try {
    const summary = await syncWarehouseLocations(context.orgId);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "위치 생성/갱신 처리에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
