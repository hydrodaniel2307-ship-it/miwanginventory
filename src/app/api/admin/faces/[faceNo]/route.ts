import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrgContext } from "@/lib/org-context";
import {
  FACE_MAX,
  FACE_MIN,
  getWarehouseFaces,
  updateWarehouseFaceConfig,
} from "@/lib/location-system";

type Params = {
  params: Promise<{
    faceNo: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdminOrgContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { context } = auth;

  const { faceNo: faceNoParam } = await params;
  const faceNo = Number(faceNoParam);
  if (!Number.isInteger(faceNo) || faceNo < FACE_MIN || faceNo > FACE_MAX) {
    return NextResponse.json(
      { error: `선반 번호는 ${FACE_MIN}~${FACE_MAX} 범위여야 합니다.` },
      { status: 400 }
    );
  }

  let payload: { bay_count?: number; level_count?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const bayCount = Number(payload.bay_count);
  const levelCount = Number(payload.level_count);

  if (!Number.isInteger(bayCount) || bayCount < 1 || bayCount > 99) {
    return NextResponse.json(
      { error: "베이 수는 1~99 정수여야 합니다." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(levelCount) || levelCount < 1 || levelCount > 10) {
    return NextResponse.json(
      { error: "단 수는 1~10 정수여야 합니다." },
      { status: 400 }
    );
  }

  try {
    await getWarehouseFaces(context.orgId);
    const face = await updateWarehouseFaceConfig(
      context.orgId,
      faceNo,
      bayCount,
      levelCount
    );

    return NextResponse.json({ data: face });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "선반 설정 저장에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
