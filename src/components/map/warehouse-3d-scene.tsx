"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import type { WarehouseLocation } from "@/lib/types/database";
import type { DecorItem } from "@/lib/map-layout";

type Warehouse3DSceneProps = {
  locations: WarehouseLocation[];
  onSelectLocation: (location: WarehouseLocation) => void;
  selectedLocationId?: string | null;
  editorMode: boolean;
  visualMode: "dark" | "bright";
  decorItems: DecorItem[];
  selectedDecorId?: string | null;
  onSelectDecor: (id: string | null) => void;
  onPlaceDecor: (x: number, z: number) => void;
};

type FaceGroup = {
  faceNo: number;
  locations: WarehouseLocation[];
  rawMaxBay: number;
  rawMaxLevel: number;
  maxBay: number;
  maxLevel: number;
};

type CellInfo = {
  x: number;
  y: number;
  z: number;
  loc: WarehouseLocation | null;
};

const CELL_W = 1.2;
const CELL_H = 0.9;
const CELL_D = 1.6;
const GAP = 0.08;
const BG_DARK = "#060a14";
const BG_BRIGHT = "#f4f8ff";

const MAX_RENDER_BAYS = 14;
const MAX_RENDER_LEVELS = 5;
const MAX_RENDER_CELLS_HINT = 1000;

function groupByFace(locations: WarehouseLocation[]): FaceGroup[] {
  const map = new Map<number, WarehouseLocation[]>();

  for (const loc of locations) {
    if (loc.is_virtual || loc.face_no == null) continue;
    const arr = map.get(loc.face_no) ?? [];
    arr.push(loc);
    map.set(loc.face_no, arr);
  }

  const groups: FaceGroup[] = [];
  for (let f = 1; f <= 11; f += 1) {
    const locs = map.get(f) ?? [];
    const rawMaxBay = locs.reduce((m, l) => Math.max(m, l.bay_no ?? 0), 0);
    const rawMaxLevel = locs.reduce((m, l) => Math.max(m, l.level_no ?? 0), 0);

    groups.push({
      faceNo: f,
      locations: locs,
      rawMaxBay,
      rawMaxLevel,
      maxBay: Math.min(rawMaxBay, MAX_RENDER_BAYS),
      maxLevel: Math.min(rawMaxLevel, MAX_RENDER_LEVELS),
    });
  }

  return groups;
}

function getFacePosition(faceNo: number): [number, number] {
  const aisleGap = 2.2;
  const pairSpacing = 0.6;
  const aisleSpacing = 8;

  let aisleIndex: number;
  let pairIndex: number;
  let side: number;

  if (faceNo <= 4) {
    aisleIndex = 0;
    pairIndex = Math.floor((faceNo - 1) / 2);
    side = (faceNo - 1) % 2;
  } else if (faceNo <= 8) {
    aisleIndex = 1;
    pairIndex = Math.floor((faceNo - 5) / 2);
    side = (faceNo - 5) % 2;
  } else {
    aisleIndex = 2;
    if (faceNo === 11) {
      pairIndex = 1;
      side = 0;
    } else {
      pairIndex = Math.floor((faceNo - 9) / 2);
      side = (faceNo - 9) % 2;
    }
  }

  const x = -(aisleIndex * aisleSpacing);
  const zBase = pairIndex * (CELL_D * 4 + aisleGap + pairSpacing + 2);
  const z = side === 0 ? zBase : zBase + CELL_D + pairSpacing;
  return [x, z];
}

function buildCells(faceGroups: FaceGroup[]) {
  const cells: CellInfo[] = [];

  for (const face of faceGroups) {
    if (face.maxBay <= 0 || face.maxLevel <= 0) continue;

    const [fx, fz] = getFacePosition(face.faceNo);

    const locMap = new Map<string, WarehouseLocation>();
    for (const loc of face.locations) {
      if ((loc.bay_no ?? 0) > face.maxBay || (loc.level_no ?? 0) > face.maxLevel) {
        continue;
      }
      locMap.set(`${loc.bay_no}-${loc.level_no}`, loc);
    }

    for (let bay = 0; bay < face.maxBay; bay += 1) {
      for (let level = 0; level < face.maxLevel; level += 1) {
        const loc = locMap.get(`${bay + 1}-${level + 1}`) ?? null;
        cells.push({
          x: fx + bay * CELL_W,
          y: 0.05 + level * CELL_H,
          z: fz,
          loc,
        });
      }
    }
  }

  return cells;
}

function ShelfCells({
  cells,
  selectedId,
  editorMode,
  visualMode,
  onSelect,
}: {
  cells: CellInfo[];
  selectedId?: string | null;
  editorMode: boolean;
  visualMode: "dark" | "bright";
  onSelect: (loc: WarehouseLocation) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredRef = useRef(-1);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const obj = new THREE.Object3D();
    for (let i = 0; i < cells.length; i += 1) {
      obj.position.set(cells[i].x, cells[i].y, cells[i].z);
      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [cells, invalidate]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const color = new THREE.Color();
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      const isSelected = cell.loc?.id === selectedId;

      if (isSelected) {
        color.set("#22d3ee");
      } else if (cell.loc) {
        color.set(visualMode === "bright" ? "#99d8ff" : "#1a2744");
      } else {
        color.set(visualMode === "bright" ? "#dbeafe" : "#111827");
      }

      mesh.setColorAt(i, color);
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [cells, selectedId, visualMode, invalidate]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const nextId = e.instanceId ?? -1;
      if (hoveredRef.current === nextId) return;

      hoveredRef.current = nextId;
      const cursor =
        !editorMode && nextId >= 0 && cells[nextId]?.loc ? "pointer" : "auto";
      if (document.body.style.cursor !== cursor) {
        document.body.style.cursor = cursor;
      }
    },
    [cells, editorMode]
  );

  const handlePointerOut = useCallback(() => {
    hoveredRef.current = -1;
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (editorMode) return;
      if (e.instanceId == null) return;
      const cell = cells[e.instanceId];
      if (cell?.loc) onSelect(cell.loc);
    },
    [cells, editorMode, onSelect]
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
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}
    >
      <boxGeometry args={[CELL_W - GAP, CELL_H - GAP, CELL_D - GAP]} />
      <meshLambertMaterial transparent opacity={0.4} />
    </instancedMesh>
  );
}

function DecorObjects({
  items,
  selectedId,
  onSelect,
}: {
  items: DecorItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <group>
      {items.map((item) => {
        const isSelected = item.id === selectedId;

        const width = Math.max(0.6, item.width * 0.55);
        const depth = Math.max(0.6, item.depth * 0.55);
        const height =
          item.kind === "pallet"
            ? Math.max(0.2, item.height * 0.18)
            : item.kind === "shelf"
              ? Math.max(0.8, item.height * 0.55)
              : Math.max(0.5, item.height * 0.4);

        const color =
          item.kind === "box"
            ? "#f59e0b"
            : item.kind === "pallet"
              ? "#a16207"
              : "#0ea5e9";

        return (
          <mesh
            key={item.id}
            position={[item.x, height / 2, item.z]}
            rotation={[0, item.rotationY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.id);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              if (document.body.style.cursor !== "pointer") {
                document.body.style.cursor = "pointer";
              }
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
              color={color}
              metalness={0.2}
              roughness={0.55}
              emissive={isSelected ? "#22d3ee" : "#000000"}
              emissiveIntensity={isSelected ? 0.35 : 0}
              transparent
              opacity={0.92}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Floor({
  editorMode,
  visualMode,
  onPlaceDecor,
}: {
  editorMode: boolean;
  visualMode: "dark" | "bright";
  onPlaceDecor: (x: number, z: number) => void;
}) {
  const grid = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const width = 50;
    const height = 30;
    const step = 2;

    for (let z = -height / 2; z <= height / 2; z += step) {
      points.push(new THREE.Vector3(-width / 2, 0, z));
      points.push(new THREE.Vector3(width / 2, 0, z));
    }

    for (let x = -width / 2; x <= width / 2; x += step) {
      points.push(new THREE.Vector3(x, 0, -height / 2));
      points.push(new THREE.Vector3(x, 0, height / 2));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={(e) => {
          if (!editorMode) return;
          e.stopPropagation();
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
        <planeGeometry args={[50, 30]} />
        <meshBasicMaterial color={visualMode === "bright" ? "#edf4ff" : "#0a0e1a"} />
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

function WarehouseScene({
  locations,
  onSelectLocation,
  selectedLocationId,
  editorMode,
  visualMode,
  decorItems,
  selectedDecorId,
  onSelectDecor,
  onPlaceDecor,
}: Warehouse3DSceneProps) {
  const faceGroups = useMemo(() => groupByFace(locations), [locations]);
  const cells = useMemo(() => buildCells(faceGroups), [faceGroups]);

  return (
    <>
      <OrthographicCamera makeDefault position={[15, 18, 20]} zoom={26} />
      <OrbitControls
        enableDamping={false}
        enableRotate
        enablePan
        enableZoom
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.75}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        maxZoom={52}
        minZoom={12}
        target={[-6, 0, 4]}
      />

      <ambientLight intensity={visualMode === "bright" ? 0.9 : 0.62} />
      <directionalLight
        position={[8, 14, 8]}
        intensity={visualMode === "bright" ? 0.58 : 0.32}
      />

      <Floor
        editorMode={editorMode}
        visualMode={visualMode}
        onPlaceDecor={onPlaceDecor}
      />

      <ShelfCells
        cells={cells}
        selectedId={selectedLocationId}
        editorMode={editorMode}
        visualMode={visualMode}
        onSelect={onSelectLocation}
      />

      <DecorObjects
        items={decorItems}
        selectedId={selectedDecorId}
        onSelect={onSelectDecor}
      />
    </>
  );
}

export function Warehouse3DScene(props: Warehouse3DSceneProps) {
  const stats = useMemo(() => {
    const groups = groupByFace(props.locations);
    const totalCells = groups.reduce((sum, g) => sum + g.maxBay * g.maxLevel, 0);
    const rawTotalCells = groups.reduce((sum, g) => sum + g.rawMaxBay * g.rawMaxLevel, 0);
    const hiddenCells = Math.max(0, rawTotalCells - totalCells);
    const simplified = hiddenCells > 0 || totalCells > MAX_RENDER_CELLS_HINT;
    return { totalCells, hiddenCells, simplified };
  }, [props.locations]);

  const isBright = props.visualMode === "bright";

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-cyan-500/20"
      style={{ height: "clamp(450px, 65vh, 750px)" }}
    >
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          precision: "lowp",
        }}
        dpr={[0.75, 1.1]}
        frameloop="demand"
        shadows={false}
        style={{ background: isBright ? BG_BRIGHT : BG_DARK }}
        performance={{ min: 0.5 }}
        onPointerMissed={() => props.onSelectDecor(null)}
      >
        <WarehouseScene {...props} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-cyan-500/50" />
        <div className="absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-cyan-500/50" />
        <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-cyan-500/50" />
        <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-cyan-500/50" />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-3 py-1.5 text-[11px] text-cyan-400/70 backdrop-blur-sm">
        {props.editorMode
          ? "편집 모드: 바닥 클릭 배치 | 오브젝트 클릭 선택 | 드래그 회전/이동"
          : "마우스 드래그: 회전 | 스크롤: 확대/축소 | 셀 클릭: 상세보기"}
      </div>

      {stats.totalCells === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-cyan-500/30 bg-black/70 px-4 py-2 text-sm text-cyan-300 backdrop-blur-sm">
          위치 데이터가 없어 기본 맵으로 표시 중입니다.
        </div>
      )}

      {stats.simplified && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-amber-500/30 bg-black/65 px-3 py-1.5 text-[11px] text-amber-300 backdrop-blur-sm">
          성능 모드 활성: 3D 셀 {stats.totalCells.toLocaleString()}개 렌더
          {stats.hiddenCells > 0
            ? ` (간소화 ${stats.hiddenCells.toLocaleString()}칸)`
            : ""}
        </div>
      )}
    </div>
  );
}
