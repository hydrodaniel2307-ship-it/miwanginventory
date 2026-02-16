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

