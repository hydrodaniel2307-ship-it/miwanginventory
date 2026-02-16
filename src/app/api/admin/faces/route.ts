import { NextResponse } from "next/server";
import { getOrgContext, isAdminRole } from "@/lib/org-context";
import { getWarehouseFaces } from "@/lib/location-system";

export async function GET() {
  const context = await getOrgContext();
  if (!context) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isAdminRole(context.session.role)) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: 403 }
    );
  }

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
