import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, isAdminRole } from "@/lib/org-context";
import { FACE_MAX, FACE_MIN, getWarehouseLocations } from "@/lib/location-system";

export async function GET(request: NextRequest) {
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

  const { searchParams } = request.nextUrl;
  const faceNoParam = searchParams.get("face_no");
  const query = searchParams.get("q") ?? undefined;

  let faceNo: number | undefined;
  if (faceNoParam) {
    const parsed = Number(faceNoParam);
    if (!Number.isInteger(parsed) || parsed < FACE_MIN || parsed > FACE_MAX) {
      return NextResponse.json(
        { error: `선반 번호는 ${FACE_MIN}~${FACE_MAX} 범위여야 합니다.` },
        { status: 400 }
      );
    }
    faceNo = parsed;
  }

  try {
    const locations = await getWarehouseLocations(context.orgId, faceNo, query);
    return NextResponse.json({ data: locations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "위치 목록을 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
