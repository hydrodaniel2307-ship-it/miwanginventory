import { buildLocationCode } from "@/lib/location-system";

type LocationLike = {
  code?: string | null;
  display_name?: string | null;
  face_no?: number | null;
  bay_no?: number | null;
  level_no?: number | null;
};

function normalizeCodeByPattern(raw: string): string | null {
  const match = raw.trim().toUpperCase().match(/^F(\d{1,2})-B(\d{1,2})-L(\d{1,2})$/);
  if (!match) return null;

  const faceNo = Number(match[1]);
  const bayNo = Number(match[2]);
  const levelNo = Number(match[3]);

  if (!Number.isInteger(faceNo) || !Number.isInteger(bayNo) || !Number.isInteger(levelNo)) {
    return null;
  }

  return buildLocationCode(faceNo, bayNo, levelNo);
}

export function toCanonicalLocationCode(raw: string): string {
  return normalizeCodeByPattern(raw) ?? raw.trim();
}

export function buildLocationAliases(location: LocationLike): string[] {
  const aliases = new Set<string>();

  const code = location.code?.trim();
  const displayName = location.display_name?.trim();

  if (code) {
    aliases.add(code);
    aliases.add(code.toUpperCase());
    const normalized = normalizeCodeByPattern(code);
    if (normalized) aliases.add(normalized);
  }

  if (displayName) aliases.add(displayName);

  if (
    location.face_no != null &&
    location.bay_no != null &&
    location.level_no != null
  ) {
    const faceNo = location.face_no;
    const bayNo = location.bay_no;
    const levelNo = location.level_no;

    aliases.add(buildLocationCode(faceNo, bayNo, levelNo));
    aliases.add(`F${faceNo}-B${bayNo}-L${levelNo}`);
    aliases.add(`선반 ${faceNo} · 베이 ${bayNo} · ${levelNo}단`);

    const faceLetter = String.fromCharCode(64 + faceNo);
    aliases.add(`${faceLetter}-${String(bayNo).padStart(3, "0")}-${levelNo}층`);
    aliases.add(`${faceLetter}-${String(bayNo).padStart(2, "0")}-${levelNo}층`);
    aliases.add(`${faceLetter}-${bayNo}-${levelNo}층`);
  }

  return [...aliases].filter((value) => value.length > 0);
}
