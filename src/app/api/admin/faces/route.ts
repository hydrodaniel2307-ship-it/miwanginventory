import { NextResponse } from "next/server";
import { requireAdminOrgContext } from "@/lib/org-context";
import { getWarehouseFaces } from "@/lib/location-system";

export async function GET() {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  try {
    const faces = await getWarehouseFaces(context.orgId);
    return NextResponse.json({ data: faces });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "선반 설정을 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
