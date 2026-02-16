import { NextResponse } from "next/server";
import { getOrgContext, isAdminRole } from "@/lib/org-context";
import { syncWarehouseLocations } from "@/lib/location-system";

export async function POST() {
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
