export type DecorKind = "box" | "pallet" | "shelf";

export type DecorItem = {
  id: string;
  kind: DecorKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
};

export type DecorTool = {
  kind: DecorKind;
  width: number;
  depth: number;
  height: number;
};

export const MAP_LAYOUT_STORAGE_KEY = "miwang-map-layout-v1";

export const DEFAULT_TOOL_BY_KIND: Record<DecorKind, DecorTool> = {
  box: { kind: "box", width: 2, depth: 2, height: 2 },
  pallet: { kind: "pallet", width: 2, depth: 2, height: 1 },
  shelf: { kind: "shelf", width: 4, depth: 2, height: 4 },
};

export function clampSize(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(10, Math.max(1, Math.round(value)));
}

export function clampCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function makeDecorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function sanitizeDecorItem(item: DecorItem): DecorItem {
  return {
    ...item,
    x: clampCoord(item.x),
    z: clampCoord(item.z),
    width: clampSize(item.width),
    depth: clampSize(item.depth),
    height: clampSize(item.height),
    rotationY: Number.isFinite(item.rotationY) ? item.rotationY : 0,
  };
}

/**
 * Generate the default warehouse rack layout.
 * Creates 11 shelf rows (one per face), each spanning 10 bays.
 * Coordinates match the 3D scene cell positioning:
 *   x = bay center, z = (faceNo - 1) * 3.0 - 15.0
 */
export const RACK_LAYOUT_MIN_ITEMS = 50;

export function generateDefaultRackLayout(): DecorItem[] {
  const FACE_COUNT = 11;
  const RACK_WIDTH = 10;
  const RACK_DEPTH = 2;
  const RACK_HEIGHT = 4;
  const FACE_SPACING = 3.0;
  const Z_OFFSET = -15.0;

  const items: DecorItem[] = [];

  for (let face = 1; face <= FACE_COUNT; face++) {
    const z = (face - 1) * FACE_SPACING + Z_OFFSET;
    items.push({
      id: `rack-face-${face}`,
      kind: "shelf",
      x: 0,
      z,
      width: RACK_WIDTH,
      depth: RACK_DEPTH,
      height: RACK_HEIGHT,
      rotationY: 0,
    });
  }

  return items;
}

