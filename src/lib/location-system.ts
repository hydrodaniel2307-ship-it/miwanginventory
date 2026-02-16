import { createClient } from "@/lib/supabase/admin";
import type { WarehouseFace, WarehouseLocation } from "@/lib/types/database";

export const FACE_MIN = 1;
export const FACE_MAX = 11;
export const DEFAULT_BAY_COUNT = 10;
export const DEFAULT_LEVEL_COUNT = 4;

export const STAGE_IN_CODE = "STAGE-IN";
export const STAGE_OUT_CODE = "STAGE-OUT";

type SupabaseClient = ReturnType<typeof createClient>;

type PhysicalLocationInsert = {
  org_id: string;
  code: string;
  face_no: number;
  bay_no: number;
  level_no: number;
  active: boolean;
  is_virtual: boolean;
  display_name: string;
};

export type LocationSyncResult = {
  created: number;
  reactivated: number;
  deactivated: number;
};

export function buildLocationCode(
  faceNo: number,
  bayNo: number,
  levelNo: number
): string {
  return `F${String(faceNo).padStart(2, "0")}-B${String(bayNo).padStart(2, "0")}-L${levelNo}`;
}

function buildLocationDisplayName(
  faceNo: number,
  bayNo: number,
  levelNo: number
): string {
  return `선반 ${faceNo} · 베이 ${bayNo} · ${levelNo}단`;
}

function isWarehouseTableMissingError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error ?? "").toLowerCase();

  const mentionsTable =
    msg.includes("warehouse_locations") || msg.includes("warehouse_faces");

  const mentionsMissing =
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("could not find the table");

  return mentionsTable && mentionsMissing;
}

function buildFallbackFaces(orgId: string): WarehouseFace[] {
  const now = new Date().toISOString();

  return Array.from({ length: FACE_MAX }, (_, idx) => {
    const faceNo = idx + 1;
    return {
      id: `fallback-face-${orgId}-${faceNo}`,
      org_id: orgId,
      face_no: faceNo,
      name: `선반 ${faceNo}`,
      bay_count: DEFAULT_BAY_COUNT,
      level_count: DEFAULT_LEVEL_COUNT,
      active: true,
      created_at: now,
      updated_at: now,
    };
  });
}

function buildFallbackLocations(orgId: string): WarehouseLocation[] {
  const now = new Date().toISOString();
  const rows: WarehouseLocation[] = [];

  for (let faceNo = FACE_MIN; faceNo <= FACE_MAX; faceNo += 1) {
    for (let bayNo = 1; bayNo <= DEFAULT_BAY_COUNT; bayNo += 1) {
      for (let levelNo = 1; levelNo <= DEFAULT_LEVEL_COUNT; levelNo += 1) {
        const code = buildLocationCode(faceNo, bayNo, levelNo);
        rows.push({
          id: `fallback-${orgId}-${code}`,
          org_id: orgId,
          code,
          face_no: faceNo,
          bay_no: bayNo,
          level_no: levelNo,
          active: true,
          is_virtual: false,
          display_name: buildLocationDisplayName(faceNo, bayNo, levelNo),
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  rows.push(
    {
      id: `fallback-${orgId}-${STAGE_IN_CODE}`,
      org_id: orgId,
      code: STAGE_IN_CODE,
      face_no: null,
      bay_no: null,
      level_no: null,
      active: true,
      is_virtual: true,
      display_name: "입고대기",
      created_at: now,
      updated_at: now,
    },
    {
      id: `fallback-${orgId}-${STAGE_OUT_CODE}`,
      org_id: orgId,
      code: STAGE_OUT_CODE,
      face_no: null,
      bay_no: null,
      level_no: null,
      active: true,
      is_virtual: true,
      display_name: "출고대기",
      created_at: now,
      updated_at: now,
    }
  );

  return rows;
}

function filterLocations(
  rows: WarehouseLocation[],
  faceNo?: number,
  query?: string
): WarehouseLocation[] {
  const faceFiltered = rows.filter((row) => {
    if (row.is_virtual) return true;
    if (!faceNo) return true;
    return row.face_no === faceNo;
  });

  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return faceFiltered;

  return faceFiltered.filter((row) => {
    const parts = [
      row.code,
      row.display_name ?? "",
      row.face_no ? String(row.face_no) : "",
      row.bay_no ? String(row.bay_no) : "",
      row.level_no ? String(row.level_no) : "",
    ];

    return parts.some((part) => part.toLowerCase().includes(normalizedQuery));
  });
}

async function ensureDefaultFaces(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("warehouse_faces")
    .select("face_no, bay_count, level_count")
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  const existingMap = new Map<number, { bay_count: number; level_count: number }>(
    (data ?? []).map((row) => [row.face_no, row])
  );

  const toInsert: Omit<WarehouseFace, "id" | "created_at" | "updated_at">[] = [];
  const toUpdateFaceNos: number[] = [];

  for (let faceNo = FACE_MIN; faceNo <= FACE_MAX; faceNo += 1) {
    const existing = existingMap.get(faceNo);
    if (!existing) {
      toInsert.push({
        org_id: orgId,
        face_no: faceNo,
        name: `선반 ${faceNo}`,
        bay_count: DEFAULT_BAY_COUNT,
        level_count: DEFAULT_LEVEL_COUNT,
        active: true,
      });
    } else if (
      existing.bay_count < DEFAULT_BAY_COUNT ||
      existing.level_count < DEFAULT_LEVEL_COUNT
    ) {
      toUpdateFaceNos.push(faceNo);
    }
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("warehouse_faces").insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  if (toUpdateFaceNos.length > 0) {
    const { error: updateError } = await supabase
      .from("warehouse_faces")
      .update({
        bay_count: DEFAULT_BAY_COUNT,
        level_count: DEFAULT_LEVEL_COUNT,
      })
      .eq("org_id", orgId)
      .in("face_no", toUpdateFaceNos);
    if (updateError) throw new Error(updateError.message);
  }
}

async function ensureVirtualLocations(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("warehouse_locations")
    .select("id, code, active")
    .eq("org_id", orgId)
    .in("code", [STAGE_IN_CODE, STAGE_OUT_CODE]);

  if (error) throw new Error(error.message);

  const existingByCode = new Map((data ?? []).map((row) => [row.code, row]));
  const toInsert: Omit<WarehouseLocation, "id" | "created_at" | "updated_at">[] = [];
  const toActivateIds: string[] = [];

  for (const stage of [
    { code: STAGE_IN_CODE, display_name: "입고대기" },
    { code: STAGE_OUT_CODE, display_name: "출고대기" },
  ]) {
    const existing = existingByCode.get(stage.code);
    if (!existing) {
      toInsert.push({
        org_id: orgId,
        code: stage.code,
        face_no: null,
        bay_no: null,
        level_no: null,
        active: true,
        is_virtual: true,
        display_name: stage.display_name,
      });
      continue;
    }

    if (!existing.active) {
      toActivateIds.push(existing.id);
    }
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("warehouse_locations")
      .insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  if (toActivateIds.length > 0) {
    const { error: activateError } = await supabase
      .from("warehouse_locations")
      .update({ active: true })
      .in("id", toActivateIds);
    if (activateError) throw new Error(activateError.message);
  }
}

export async function getWarehouseFaces(orgId: string): Promise<WarehouseFace[]> {
  const supabase = createClient();

  try {
    await ensureDefaultFaces(supabase, orgId);

    const { data, error } = await supabase
      .from("warehouse_faces")
      .select("*")
      .eq("org_id", orgId)
      .order("face_no", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as WarehouseFace[];
  } catch (error) {
    if (isWarehouseTableMissingError(error)) {
      return buildFallbackFaces(orgId);
    }
    throw error;
  }
}

export async function updateWarehouseFaceConfig(
  orgId: string,
  faceNo: number,
  bayCount: number,
  levelCount: number
): Promise<WarehouseFace> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("warehouse_faces")
      .update({
        bay_count: bayCount,
        level_count: levelCount,
        active: true,
        name: `선반 ${faceNo}`,
      })
      .eq("org_id", orgId)
      .eq("face_no", faceNo)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as WarehouseFace;
  } catch (error) {
    if (isWarehouseTableMissingError(error)) {
      const now = new Date().toISOString();
      return {
        id: `fallback-face-${orgId}-${faceNo}`,
        org_id: orgId,
        face_no: faceNo,
        name: `선반 ${faceNo}`,
        bay_count: bayCount,
        level_count: levelCount,
        active: true,
        created_at: now,
        updated_at: now,
      };
    }
    throw error;
  }
}

export async function syncWarehouseLocations(
  orgId: string
): Promise<LocationSyncResult> {
  const supabase = createClient();

  try {
    await ensureDefaultFaces(supabase, orgId);
    await ensureVirtualLocations(supabase, orgId);

    const { data: faces, error: facesError } = await supabase
      .from("warehouse_faces")
      .select("face_no, bay_count, level_count, active")
      .eq("org_id", orgId)
      .order("face_no", { ascending: true });

    if (facesError) throw new Error(facesError.message);

    const { data: existingRows, error: existingError } = await supabase
      .from("warehouse_locations")
      .select("id, code, face_no, bay_no, level_no, active, is_virtual")
      .eq("org_id", orgId)
      .eq("is_virtual", false);

    if (existingError) throw new Error(existingError.message);

    const desiredByCode = new Map<string, PhysicalLocationInsert>();

    for (const face of faces ?? []) {
      if (!face.active) continue;

      for (let bayNo = 1; bayNo <= face.bay_count; bayNo += 1) {
        for (let levelNo = 1; levelNo <= face.level_count; levelNo += 1) {
          const code = buildLocationCode(face.face_no, bayNo, levelNo);
          desiredByCode.set(code, {
            org_id: orgId,
            code,
            face_no: face.face_no,
            bay_no: bayNo,
            level_no: levelNo,
            active: true,
            is_virtual: false,
            display_name: buildLocationDisplayName(face.face_no, bayNo, levelNo),
          });
        }
      }
    }

    const toDeactivateIds: string[] = [];
    const toReactivateIds: string[] = [];

    for (const existing of existingRows ?? []) {
      const desired = desiredByCode.get(existing.code);

      if (!desired) {
        if (existing.active) {
          toDeactivateIds.push(existing.id);
        }
        continue;
      }

      desiredByCode.delete(existing.code);

      if (!existing.active) {
        toReactivateIds.push(existing.id);
      }
    }

    const toInsert = Array.from(desiredByCode.values());

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("warehouse_locations")
        .insert(toInsert);
      if (insertError) throw new Error(insertError.message);
    }

    if (toReactivateIds.length > 0) {
      const { error: reactivateError } = await supabase
        .from("warehouse_locations")
        .update({ active: true })
        .in("id", toReactivateIds);
      if (reactivateError) throw new Error(reactivateError.message);
    }

    if (toDeactivateIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from("warehouse_locations")
        .update({ active: false })
        .in("id", toDeactivateIds);
      if (deactivateError) throw new Error(deactivateError.message);
    }

    return {
      created: toInsert.length,
      reactivated: toReactivateIds.length,
      deactivated: toDeactivateIds.length,
    };
  } catch (error) {
    if (isWarehouseTableMissingError(error)) {
      return { created: 0, reactivated: 0, deactivated: 0 };
    }
    throw error;
  }
}

export async function getWarehouseLocations(
  orgId: string,
  faceNo?: number,
  query?: string
): Promise<WarehouseLocation[]> {
  const supabase = createClient();

  try {
    await ensureVirtualLocations(supabase, orgId);

    const builder = supabase
      .from("warehouse_locations")
      .select("*")
      .eq("org_id", orgId)
      .order("is_virtual", { ascending: false })
      .order("face_no", { ascending: true, nullsFirst: false })
      .order("bay_no", { ascending: true, nullsFirst: false })
      .order("level_no", { ascending: true, nullsFirst: false });

    const { data, error } = await builder;
    if (error) throw new Error(error.message);

    return filterLocations((data ?? []) as WarehouseLocation[], faceNo, query);
  } catch (error) {
    if (isWarehouseTableMissingError(error)) {
      return filterLocations(buildFallbackLocations(orgId), faceNo, query);
    }
    throw error;
  }
}

