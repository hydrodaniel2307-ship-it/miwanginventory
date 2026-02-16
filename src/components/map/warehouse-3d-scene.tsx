"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import type { WarehouseLocation, WarehouseCell } from "@/lib/types/database";
import type { DecorItem } from "@/lib/map-layout";

// ── Types ────────────────────────────────────────────────────────────────────

type InventorySummaryItem = {
  location: string;
  totalQty: number;
  itemCount: number;
  hasLowStock: boolean;
};

type Warehouse3DSceneProps = {
  locations: WarehouseLocation[];
  dbCells?: WarehouseCell[];
  onSelectLocation: (location: WarehouseLocation) => void;
  selectedLocationId?: string | null;
  editorMode: boolean;
  visualMode: "dark" | "bright";
  decorItems: DecorItem[];
  selectedDecorId?: string | null;
  onSelectDecor: (id: string | null) => void;
  onPlaceDecor: (x: number, z: number) => void;
  inventorySummary?: Map<string, InventorySummaryItem>;
  highlightedCodes?: Set<string>;
  onClickEmptyCell?: (faceNo: number, bay: number, level: number) => void;
  temperature?: number;
  onSelectCell?: (cell: CellInfo) => void;
  selectedCellId?: string | null;
  onCreateCell?: (x: number, z: number) => void;
  onMoveCell?: (cellId: string, newX: number, newZ: number) => void;
};

type FaceGroup = {
  faceNo: number;
  locations: WarehouseLocation[];
  maxBay: number;
  maxLevel: number;
};

type CellInfo = {
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
  depth?: number;
  loc: WarehouseLocation | null;
  faceNo: number;
  bay: number;
  level: number;
  cellId?: string;
  cellType?: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const CELL_W = 1.0;
const CELL_H = 0.8;
const CELL_D = 1.2;
const GAP = 0.06;
const ROW_GAP = 1.8;
const BAYS_PER_FACE = 10;
const NUM_FACES = 11;
const LEVELS = 4;
const GRID_WIDTH = BAYS_PER_FACE * CELL_W;
const GRID_HEIGHT = LEVELS * CELL_H;
const BG_DARK = "#0a0f1e";
const BG_BRIGHT = "#f0f4fa";

type SceneErrorBoundaryProps = {
  children: React.ReactNode;
  onError?: () => void;
};

type SceneErrorBoundaryState = {
  hasError: boolean;
};

class SceneErrorBoundary extends React.Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ── Device detection ────────────────────────────────────────────────────────

function getDeviceTier(): "low" | "mid" | "high" {
  if (typeof window === "undefined") return "mid";
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const cores = navigator.hardwareConcurrency ?? 4;
  if (isMobile && cores <= 4) return "low";
  if (isMobile) return "mid";
  return "high";
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupByFace(locations: WarehouseLocation[]): FaceGroup[] {
  const map = new Map<number, WarehouseLocation[]>();

  for (const loc of locations) {
    if (loc.is_virtual || loc.face_no == null) continue;
    const arr = map.get(loc.face_no) ?? [];
    arr.push(loc);
    map.set(loc.face_no, arr);
  }

  const groups: FaceGroup[] = [];
  for (let f = 1; f <= NUM_FACES; f += 1) {
    const locs = map.get(f) ?? [];
    const maxBay = locs.reduce((m, l) => Math.max(m, l.bay_no ?? 0), 0);
    const maxLevel = locs.reduce((m, l) => Math.max(m, l.level_no ?? 0), 0);
    groups.push({ faceNo: f, locations: locs, maxBay, maxLevel });
  }

  return groups;
}

function getFacePosition(faceNo: number): { x: number; z: number } {
  const rowIndex = faceNo - 1;
  const totalDepth = (NUM_FACES - 1) * (CELL_D + ROW_GAP);
  const z = rowIndex * (CELL_D + ROW_GAP) - totalDepth / 2;
  const x = -GRID_WIDTH / 2;
  return { x, z };
}

function buildCells(faceGroups: FaceGroup[]): CellInfo[] {
  const cells: CellInfo[] = [];

  for (const face of faceGroups) {
    const { x: fx, z: fz } = getFacePosition(face.faceNo);

    const locMap = new Map<string, WarehouseLocation>();
    for (const loc of face.locations) {
      locMap.set(`${loc.bay_no}-${loc.level_no}`, loc);
    }

    for (let bay = 1; bay <= BAYS_PER_FACE; bay += 1) {
      for (let level = 1; level <= LEVELS; level += 1) {
        const loc = locMap.get(`${bay}-${level}`) ?? null;
        cells.push({
          x: fx + (bay - 1) * CELL_W,
          y: (level - 1) * CELL_H,
          z: fz,
          loc,
          faceNo: face.faceNo,
          bay,
          level,
        });
      }
    }
  }

  return cells;
}

// ── Shared geometry/material (singleton) ─────────────────────────────────────

const DECOR_COLORS: Record<string, string> = {
  box: "#f59e0b",
  pallet: "#a16207",
  shelf: "#0ea5e9",
};

const DECOR_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const DECOR_MATERIAL = new THREE.MeshStandardMaterial({
  metalness: 0.2,
  roughness: 0.55,
  transparent: true,
  opacity: 0.92,
});

// Hover highlight color - allocated once, reused across pointer events
const HOVER_COLOR = new THREE.Color("#4dd0e1");

// ── ShelfCells ───────────────────────────────────────────────────────────────

function ShelfCells({
  cells,
  selectedId,
  editorMode,
  visualMode,
  onSelect,
  onClickEmpty,
  inventorySummary,
  highlightedCodes,
  onSelectCell,
  selectedCellId,
  onMoveCell,
}: {
  cells: CellInfo[];
  selectedId?: string | null;
  editorMode: boolean;
  visualMode: "dark" | "bright";
  onSelect: (loc: WarehouseLocation) => void;
  onClickEmpty?: (faceNo: number, bay: number, level: number) => void;
  inventorySummary?: Map<string, InventorySummaryItem>;
  highlightedCodes?: Set<string>;
  onSelectCell?: (cell: CellInfo) => void;
  selectedCellId?: string | null;
  onMoveCell?: (cellId: string, newX: number, newZ: number) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredRef = useRef(-1);
  const prevColorRef = useRef(new THREE.Color());
  const invalidate = useThree((state) => state.invalidate);
  const draggingRef = useRef<{ cellIndex: number; startX: number; startZ: number; cellId: string } | null>(null);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const obj = new THREE.Object3D();
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      obj.position.set(cell.x, cell.y, cell.z);

      // Apply per-cell dimensions if available
      const scaleX = (cell.width ?? CELL_W) - GAP;
      const scaleY = (cell.height ?? CELL_H) - GAP;
      const scaleZ = (cell.depth ?? CELL_D) - GAP;
      obj.scale.set(scaleX, scaleY, scaleZ);

      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    // Recompute bounding sphere so raycasting (click/hover) works correctly.
    // InstancedMesh.raycast() uses this.boundingSphere for early-exit checks.
    mesh.computeBoundingSphere();
    invalidate();
  }, [cells, invalidate]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const color = new THREE.Color();
    const isBright = visualMode === "bright";

    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      const isSelected = cell.loc?.id === selectedId;
      const isCellSelected = cell.cellId && cell.cellId === selectedCellId;
      const isHighlighted =
        cell.loc && highlightedCodes?.has(cell.loc.code);

      if (isCellSelected) {
        // Cell selected in editor mode
        color.set("#a855f7"); // Purple for cell selection
      } else if (isSelected) {
        color.set("#00e5ff");
      } else if (isHighlighted) {
        color.set("#fbbf24");
      } else if (cell.loc) {
        const summary = inventorySummary?.get(cell.loc.code);
        if (summary && summary.itemCount > 0) {
          if (summary.totalQty === 0) {
            color.set("#ef4444");
          } else if (summary.hasLowStock) {
            color.set("#f59e0b");
          } else {
            color.set(isBright ? "#22c55e" : "#16a34a");
          }
        } else {
          color.set(isBright ? "#5b9bd5" : "#1e3a5f");
        }
      } else {
        color.set(isBright ? "#e2e8f0" : "#1a1f2e");
      }

      mesh.setColorAt(i, color);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [cells, selectedId, selectedCellId, visualMode, inventorySummary, highlightedCodes, invalidate]);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!editorMode) return;
      if (e.instanceId == null) return;
      const cell = cellsRef.current[e.instanceId];
      if (!cell || !cell.cellId) return;

      // Start drag
      e.stopPropagation();
      draggingRef.current = {
        cellIndex: e.instanceId,
        startX: cell.x,
        startZ: cell.z,
        cellId: cell.cellId,
      };
    },
    [editorMode]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const mesh = meshRef.current;
      if (!mesh) return;

      // Handle dragging
      if (draggingRef.current && editorMode && onMoveCell) {
        const idx = draggingRef.current.cellIndex;
        const cell = cellsRef.current[idx];
        if (!cell) return;

        // Snap to grid
        const snapX = Math.round(e.point.x);
        const snapZ = Math.round(e.point.z);

        // Update instance matrix directly for smooth preview
        const obj = new THREE.Object3D();
        obj.position.set(snapX, cell.y, snapZ);
        obj.scale.set(
          (cell.width ?? CELL_W) - GAP,
          (cell.height ?? CELL_H) - GAP,
          (cell.depth ?? CELL_D) - GAP
        );
        obj.updateMatrix();
        mesh.setMatrixAt(idx, obj.matrix);
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        invalidate();

        // Update cursor
        if (document.body.style.cursor !== "grabbing") {
          document.body.style.cursor = "grabbing";
        }
        return;
      }

      // Handle hover (non-drag)
      const nextId = e.instanceId ?? -1;
      if (hoveredRef.current === nextId) return;

      if (hoveredRef.current >= 0 && mesh.instanceColor) {
        mesh.setColorAt(hoveredRef.current, prevColorRef.current);
        mesh.instanceColor.needsUpdate = true;
      }

      hoveredRef.current = nextId;

      if (nextId >= 0 && mesh.instanceColor) {
        // Read current color into prevColorRef for restore on pointer-out
        mesh.getColorAt(nextId, prevColorRef.current);
        mesh.setColorAt(nextId, HOVER_COLOR);
        mesh.instanceColor.needsUpdate = true;
      }

      invalidate();

      const cursor = nextId >= 0 ? (editorMode ? "grab" : "pointer") : "auto";
      if (document.body.style.cursor !== cursor && !draggingRef.current) {
        document.body.style.cursor = cursor;
      }
    },
    [editorMode, invalidate, onMoveCell]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (draggingRef.current && onMoveCell) {
        e.stopPropagation();
        const snapX = Math.round(e.point.x);
        const snapZ = Math.round(e.point.z);
        const { cellId, startX, startZ } = draggingRef.current;

        // Only call API if position actually changed
        if (snapX !== startX || snapZ !== startZ) {
          onMoveCell(cellId, snapX, snapZ);
        }

        draggingRef.current = null;
        document.body.style.cursor = "auto";
      }
    },
    [onMoveCell]
  );

  const handlePointerOut = useCallback(() => {
    const mesh = meshRef.current;
    if (mesh && hoveredRef.current >= 0 && mesh.instanceColor) {
      mesh.setColorAt(hoveredRef.current, prevColorRef.current);
      mesh.instanceColor.needsUpdate = true;
      invalidate();
    }
    hoveredRef.current = -1;
    document.body.style.cursor = "auto";
  }, [invalidate]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      // Don't trigger click if we were dragging
      if (draggingRef.current) {
        draggingRef.current = null;
        return;
      }
      if (e.instanceId == null) return;
      const cell = cellsRef.current[e.instanceId];

      // In editor mode with DB cell, select the cell for editing
      if (editorMode && cell?.cellId && onSelectCell) {
        onSelectCell(cell);
      } else if (!editorMode && onSelectCell) {
        // In view mode, always call onSelectCell to show inventory panel
        onSelectCell(cell);
      } else if (cell?.loc) {
        // Fallback: show location panel
        onSelect(cell.loc);
      } else if (cell) {
        onClickEmpty?.(cell.faceNo, cell.bay, cell.level);
      }
    },
    [editorMode, onSelect, onClickEmpty, onSelectCell]
  );

  useEffect(
    () => () => {
      document.body.style.cursor = "auto";
    },
    []
  );

  if (cells.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, cells.length]}
      renderOrder={1}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial metalness={0.15} roughness={0.65} />
    </instancedMesh>
  );
}

// ── ShelfFrame ───────────────────────────────────────────────────────────────

function ShelfFrame({ visualMode }: { visualMode: "dark" | "bright" }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  const instanceCount = NUM_FACES * (BAYS_PER_FACE + 1);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const obj = new THREE.Object3D();
    const color = new THREE.Color(
      visualMode === "bright" ? "#94a3b8" : "#334155"
    );
    let idx = 0;

    for (let face = 1; face <= NUM_FACES; face += 1) {
      const { x: fx, z: fz } = getFacePosition(face);

      for (let col = 0; col <= BAYS_PER_FACE; col += 1) {
        const px = fx + col * CELL_W - CELL_W / 2 + GAP / 2;
        const py = GRID_HEIGHT / 2 - CELL_H / 2;
        obj.position.set(px, py, fz);
        obj.updateMatrix();
        mesh.setMatrixAt(idx, obj.matrix);
        mesh.setColorAt(idx, color);
        idx += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [visualMode, invalidate]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instanceCount]}
      frustumCulled={false}
    >
      <boxGeometry args={[0.03, GRID_HEIGHT + 0.1, 0.03]} />
      <meshStandardMaterial metalness={0.6} roughness={0.3} />
    </instancedMesh>
  );
}

// ── Labels ───────────────────────────────────────────────────────────────────

function Labels({ visualMode }: { visualMode: "dark" | "bright" }) {
  const color = visualMode === "bright" ? "#334155" : "#94a3b8";

  const faceLabels = useMemo(() => {
    const items: { text: string; position: [number, number, number] }[] = [];
    for (let f = 1; f <= NUM_FACES; f += 1) {
      const { x: fx, z: fz } = getFacePosition(f);
      items.push({
        text: `F${f}`,
        position: [fx - 0.8, GRID_HEIGHT / 2, fz],
      });
    }
    return items;
  }, []);

  const bayLabels = useMemo(() => {
    const items: { text: string; position: [number, number, number] }[] = [];
    const { x: fx, z: fz } = getFacePosition(1);
    for (let b = 1; b <= BAYS_PER_FACE; b += 1) {
      items.push({
        text: `B${b}`,
        position: [fx + (b - 1) * CELL_W, GRID_HEIGHT + 0.3, fz],
      });
    }
    return items;
  }, []);

  return (
    <group>
      {faceLabels.map((item) => (
        <Text
          key={item.text}
          position={item.position}
          fontSize={0.4}
          color={color}
          anchorX="right"
          anchorY="middle"
          font={undefined}
        >
          {item.text}
        </Text>
      ))}
      {bayLabels.map((item) => (
        <Text
          key={item.text}
          position={item.position}
          fontSize={0.3}
          color={color}
          anchorX="center"
          anchorY="bottom"
          font={undefined}
        >
          {item.text}
        </Text>
      ))}
    </group>
  );
}

// ── DecorObjects (InstancedMesh for performance) ─────────────────────────────

function DecorObjects({
  items,
  selectedId,
  onSelect,
}: {
  items: DecorItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (items.length === 0) {
      mesh.count = 0;
      // Clear the cached bounding sphere so a stale degenerate sphere
      // (center=0, radius=-1) does not persist and block all future raycasts
      // once items are added.
      mesh.boundingSphere = null;
      mesh.boundingBox = null;
      invalidate();
      return;
    }

    const obj = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const isSelected = item.id === selectedId;

      const width = Math.max(0.6, item.width * 0.55);
      const depth = Math.max(0.6, item.depth * 0.55);
      const height =
        item.kind === "pallet"
          ? Math.max(0.2, item.height * 0.18)
          : item.kind === "shelf"
            ? Math.max(0.8, item.height * 0.55)
            : Math.max(0.5, item.height * 0.4);

      obj.position.set(item.x, height / 2, item.z);
      obj.rotation.set(0, item.rotationY, 0);
      obj.scale.set(width, height, depth);
      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);

      const baseColor = DECOR_COLORS[item.kind] ?? "#888888";
      color.set(isSelected ? "#22d3ee" : baseColor);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = items.length;

    // CRITICAL: Recompute bounding sphere after every instance matrix update.
    // InstancedMesh.raycast() checks this.boundingSphere to early-exit.
    // If the sphere was previously cached from an empty state (radius = -1)
    // or from stale positions, ALL raycasts silently miss - making objects
    // visible but completely unclickable.
    mesh.computeBoundingSphere();

    invalidate();
  }, [items, selectedId, invalidate]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < itemsRef.current.length) {
        onSelect(itemsRef.current[e.instanceId].id);
      }
    },
    [onSelect]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (
        e.instanceId != null &&
        e.instanceId < itemsRef.current.length &&
        document.body.style.cursor !== "pointer"
      ) {
        document.body.style.cursor = "pointer";
      }
    },
    []
  );

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "auto";
  }, []);

  // Pre-allocate buffer in power-of-2 tiers to avoid recreating the
  // InstancedMesh (and losing the boundingSphere cache) on every single
  // item addition. Mesh is only recreated when capacity tier changes.
  const capacity = useMemo(() => {
    if (items.length <= 0) return 4;
    // Round up to next power of 2, minimum 4
    return Math.max(4, 1 << Math.ceil(Math.log2(items.length)));
  }, [items.length]);
  const maxCount = capacity;

  return (
    <instancedMesh
      ref={meshRef}
      args={[DECOR_BOX_GEO, DECOR_MATERIAL, maxCount]}
      frustumCulled={false}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    />
  );
}

// ── Floor ────────────────────────────────────────────────────────────────────

function Floor({
  editorMode,
  visualMode,
  onPlaceDecor,
  onCreateCell,
}: {
  editorMode: boolean;
  visualMode: "dark" | "bright";
  onPlaceDecor: (x: number, z: number) => void;
  onCreateCell?: (x: number, z: number) => void;
}) {
  const totalDepth = (NUM_FACES - 1) * (CELL_D + ROW_GAP) + CELL_D + 4;
  const totalWidth = GRID_WIDTH + 4;

  const grid = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const step = CELL_W;
    const halfW = totalWidth / 2;
    const halfD = totalDepth / 2;

    for (let z = -halfD; z <= halfD; z += step) {
      points.push(new THREE.Vector3(-halfW, 0, z));
      points.push(new THREE.Vector3(halfW, 0, z));
    }

    for (let x = -halfW; x <= halfW; x += step) {
      points.push(new THREE.Vector3(x, 0, -halfD));
      points.push(new THREE.Vector3(x, 0, halfD));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [totalWidth, totalDepth]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={(e) => {
          if (!editorMode) return;
          e.stopPropagation();
          // TODO: Add UI toggle to switch between decor placement and cell creation
          // For now, always place decor (existing behavior)
          onPlaceDecor(Math.round(e.point.x), Math.round(e.point.z));
        }}
        onPointerMove={() => {
          if (!editorMode) return;
          if (document.body.style.cursor !== "copy") {
            document.body.style.cursor = "copy";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <planeGeometry args={[totalWidth, totalDepth]} />
        <meshBasicMaterial
          color={visualMode === "bright" ? "#edf4ff" : "#0a0e1a"}
        />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0.005, 0]}>
        <lineBasicMaterial
          color={visualMode === "bright" ? "#93c5fd" : "#1a2744"}
          transparent
          opacity={visualMode === "bright" ? 0.42 : 0.3}
        />
      </lineSegments>
    </group>
  );
}

function WebGLContextGuard({
  onContextLost,
  onContextRestored,
  onContextReady,
}: {
  onContextLost: () => void;
  onContextRestored: () => void;
  onContextReady: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    onContextReady();
    invalidate();
  }, [invalidate, onContextReady]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };

    const handleRestored = () => {
      onContextRestored();
      invalidate();
    };

    canvas.addEventListener("webglcontextlost", handleLost, false);
    canvas.addEventListener("webglcontextrestored", handleRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost, false);
      canvas.removeEventListener("webglcontextrestored", handleRestored, false);
    };
  }, [gl, invalidate, onContextLost, onContextRestored]);

  return null;
}

// ── ColdEffect (subtle fog for cold temperatures) ───────────────────────────

// Fog color per visual mode - cold-tinted, close to the scene background
// so distant objects fade naturally without a jarring color mismatch.
const FOG_COLOR_DARK = new THREE.Color("#1a2a40");
const FOG_COLOR_BRIGHT = new THREE.Color("#d8e8f8");

function ColdEffect({
  temperature,
  visualMode,
}: {
  temperature: number;
  visualMode: "dark" | "bright";
}) {
  const { scene, invalidate } = useThree();
  // Reuse a single Fog instance to avoid allocations during slider drag
  const fogRef = useRef<THREE.Fog | null>(null);

  useEffect(() => {
    if (temperature < 5) {
      // intensity: 0 at 5 deg C, clamped to 1 at -20 deg C and below
      const intensity = Math.min(1, Math.max(0, (5 - temperature) / 25));

      const fogColor =
        visualMode === "bright" ? FOG_COLOR_BRIGHT : FOG_COLOR_DARK;

      // Near/far distances - tighter range at colder temps for denser fog
      const fogNear = 50 - intensity * 20;
      const fogFar = 80 - intensity * 25;

      if (fogRef.current) {
        // Reuse existing Fog - just update properties (avoids GC pressure)
        fogRef.current.color.copy(fogColor);
        fogRef.current.near = fogNear;
        fogRef.current.far = fogFar;
      } else {
        fogRef.current = new THREE.Fog(fogColor, fogNear, fogFar);
      }
      scene.fog = fogRef.current;
    } else {
      // Clear fog when temperature is 5 deg C or above
      scene.fog = null;
    }

    invalidate();

    return () => {
      scene.fog = null;
    };
  }, [temperature, visualMode, scene, invalidate]);

  return null;
}

// ── WarehouseScene (inner scene graph) ───────────────────────────────────────

function WarehouseScene({
  locations,
  dbCells,
  onSelectLocation,
  selectedLocationId,
  editorMode,
  visualMode,
  decorItems,
  selectedDecorId,
  onSelectDecor,
  onPlaceDecor,
  inventorySummary,
  highlightedCodes,
  onClickEmptyCell,
  temperature,
  onSelectCell,
  selectedCellId,
  onCreateCell,
  onMoveCell,
}: Warehouse3DSceneProps) {
  const faceGroups = useMemo(() => groupByFace(locations), [locations]);
  const computedCells = useMemo(() => buildCells(faceGroups), [faceGroups]);

  // Use DB cells if available, otherwise fall back to computed cells
  const cells = useMemo(() => {
    if (dbCells && dbCells.length > 0) {
      return dbCells.map((cell) => ({
        x: cell.pos_x,
        y: cell.pos_y,
        z: cell.pos_z,
        width: cell.width,
        height: cell.height,
        depth: cell.depth,
        loc: locations.find((l) => l.id === cell.location_id) ?? null,
        faceNo: cell.face_no ?? 0,
        bay: cell.bay_no ?? 0,
        level: cell.level_no ?? 0,
        cellId: cell.id,
        cellType: cell.cell_type,
      }));
    }
    return computedCells;
  }, [dbCells, computedCells, locations]);

  const [labelsEnabled, setLabelsEnabled] = useState(true);

  const isBright = visualMode === "bright";
  const isTouch = useMemo(() => isTouchDevice(), []);

  return (
    <>
      <OrthographicCamera makeDefault position={[20, 25, 25]} zoom={22} />
      <OrbitControls
        enableDamping
        dampingFactor={0.12}
        enableRotate
        enablePan
        enableZoom
        rotateSpeed={isTouch ? 0.35 : 0.5}
        zoomSpeed={isTouch ? 0.6 : 0.8}
        panSpeed={isTouch ? 0.5 : 0.75}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        maxZoom={60}
        minZoom={10}
        target={[0, 1.5, 0]}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />

      <ambientLight intensity={isBright ? 0.7 : 0.4} />
      <directionalLight
        position={[12, 20, 10]}
        intensity={isBright ? 0.6 : 0.45}
      />
      <directionalLight
        position={[-8, 10, -8]}
        intensity={isBright ? 0.3 : 0.2}
      />
      <directionalLight
        position={[0, 5, -15]}
        intensity={0.15}
        color={isBright ? "#ffffff" : "#4dd0e1"}
      />

      <Floor
        editorMode={editorMode}
        visualMode={visualMode}
        onPlaceDecor={onPlaceDecor}
        onCreateCell={onCreateCell}
      />

      <ShelfCells
        cells={cells}
        selectedId={selectedLocationId}
        editorMode={editorMode}
        visualMode={visualMode}
        onSelect={onSelectLocation}
        onClickEmpty={onClickEmptyCell}
        inventorySummary={inventorySummary}
        highlightedCodes={highlightedCodes}
        onSelectCell={onSelectCell}
        selectedCellId={selectedCellId}
        onMoveCell={onMoveCell}
      />

      <ShelfFrame visualMode={visualMode} />
      {labelsEnabled && (
        <SceneErrorBoundary onError={() => setLabelsEnabled(false)}>
          <Suspense fallback={null}>
            <Labels visualMode={visualMode} />
          </Suspense>
        </SceneErrorBoundary>
      )}

      <DecorObjects
        items={decorItems}
        selectedId={selectedDecorId}
        onSelect={onSelectDecor}
      />

      {temperature != null && (
        <ColdEffect temperature={temperature} visualMode={visualMode} />
      )}
    </>
  );
}

// ── Warehouse3DScene (exported Canvas wrapper) ───────────────────────────────

export function Warehouse3DScene(props: Warehouse3DSceneProps) {
  const isBright = props.visualMode === "bright";
  const hasLocations =
    props.locations.filter((l) => l.active && !l.is_virtual).length > 0;
  const [canvasKey, setCanvasKey] = useState(0);
  const [recoveringContext, setRecoveringContext] = useState(false);
  const [contextLossCount, setContextLossCount] = useState(0);

  const tier = useMemo(() => getDeviceTier(), []);
  const isTouch = useMemo(() => isTouchDevice(), []);

  const handleContextLost = useCallback(() => {
    setRecoveringContext(true);
    setContextLossCount((count) => count + 1);
    setCanvasKey((prev) => prev + 1);
  }, []);

  const handleContextRestored = useCallback(() => {
    setRecoveringContext(false);
  }, []);

  const handleContextReady = useCallback(() => {
    setRecoveringContext(false);
  }, []);

  const glConfig = useMemo(
    () => ({
      antialias: tier === "high",
      alpha: false,
      powerPreference: (
        tier === "high" ? "high-performance" : "default"
      ) as WebGLPowerPreference,
      precision: "mediump" as "mediump",
    }),
    [tier]
  );

  const dpr: [number, number] = useMemo(
    () =>
      tier === "low" ? [0.75, 1] : tier === "mid" ? [0.9, 1.25] : [1, 1.5],
    [tier]
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-cyan-500/20"
      style={{
        height: "clamp(280px, 55vh, 750px)",
        touchAction: "none",
      }}
    >
      <Canvas
        key={canvasKey}
        gl={glConfig}
        dpr={dpr}
        frameloop="demand"
        shadows={false}
        style={{ background: isBright ? BG_BRIGHT : BG_DARK }}
        performance={{ min: tier === "low" ? 0.5 : 0.8 }}
        onPointerMissed={() => props.onSelectDecor(null)}
      >
        <WebGLContextGuard
          onContextLost={handleContextLost}
          onContextRestored={handleContextRestored}
          onContextReady={handleContextReady}
        />
        <WarehouseScene {...props} />
      </Canvas>

      {/* Corner brackets */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-2 top-2 h-5 w-5 border-l-2 border-t-2 border-cyan-500/40 sm:h-6 sm:w-6 sm:border-cyan-500/50" />
        <div className="absolute right-2 top-2 h-5 w-5 border-r-2 border-t-2 border-cyan-500/40 sm:h-6 sm:w-6 sm:border-cyan-500/50" />
        <div className="absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-cyan-500/40 sm:h-6 sm:w-6 sm:border-cyan-500/50" />
        <div className="absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-cyan-500/40 sm:h-6 sm:w-6 sm:border-cyan-500/50" />
      </div>

      {/* Bottom instruction - adaptive for touch/mouse */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-cyan-400/70 backdrop-blur-sm sm:bottom-3 sm:px-3 sm:py-1.5 sm:text-[11px]">
        {props.editorMode
          ? isTouch
            ? "탭: 배치 | 오브젝트 탭: 선택 | 핀치: 줌 | 드래그: 회전"
            : "바닥 클릭: 배치 | 오브젝트 클릭: 선택 | 드래그: 회전/이동"
          : isTouch
            ? "드래그: 회전 | 핀치: 줌 | 셀 탭: 상세보기"
            : "마우스 드래그: 회전 | 스크롤: 확대/축소 | 셀 클릭: 상세보기"}
      </div>

      {!hasLocations && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-cyan-500/30 bg-black/70 px-3 py-2 text-xs text-cyan-300 backdrop-blur-sm sm:px-4 sm:text-sm">
          위치 데이터가 없어 기본 맵으로 표시 중입니다.
        </div>
      )}

      {recoveringContext && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="rounded-md border border-cyan-500/40 bg-black/75 px-4 py-2 text-xs text-cyan-200 sm:text-sm">
            3D 엔진 복구 중...
          </div>
        </div>
      )}

      {contextLossCount > 0 && !recoveringContext && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-amber-400/40 bg-black/70 px-2.5 py-1 text-[10px] text-amber-300 sm:text-xs">
          3D 복구 완료 ({contextLossCount})
        </div>
      )}
    </div>
  );
}
