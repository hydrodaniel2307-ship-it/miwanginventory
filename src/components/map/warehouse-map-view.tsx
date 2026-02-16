"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  LayoutGrid,
  Hammer,
  Trash2,
  RotateCw,
  Lightbulb,
  LightbulbOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { WarehouseMap3D } from "./warehouse-map-3d";
import { WarehouseMapPanel } from "./warehouse-map-panel";
import {
  MAP_LAYOUT_STORAGE_KEY,
  DEFAULT_TOOL_BY_KIND,
  clampCoord,
  clampSize,
  makeDecorId,
  sanitizeDecorItem,
  type DecorItem,
  type DecorKind,
  type DecorTool,
} from "@/lib/map-layout";

export function WarehouseMapView() {
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [visualMode, setVisualMode] = useState<"dark" | "bright">("dark");
  const [editorMode, setEditorMode] = useState(false);
  const [tool, setTool] = useState<DecorTool>(DEFAULT_TOOL_BY_KIND.box);
  const [decorItems, setDecorItems] = useState<DecorItem[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(MAP_LAYOUT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as DecorItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeDecorItem);
    } catch {
      return [];
    }
  });
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, JSON.stringify(decorItems));
  }, [decorItems]);

  const selectedDecor = useMemo(
    () => decorItems.find((item) => item.id === selectedDecorId) ?? null,
    [decorItems, selectedDecorId]
  );

  function setKind(kind: DecorKind) {
    const preset = DEFAULT_TOOL_BY_KIND[kind];
    setTool({ ...preset });
  }

  function updateTool(field: keyof DecorTool, value: number) {
    setTool((prev) => ({
      ...prev,
      [field]: field === "kind" ? prev.kind : clampSize(value),
    }));
  }

  function placeDecorAt(x: number, z: number) {
    if (!editorMode) return;

    const item: DecorItem = sanitizeDecorItem({
      id: makeDecorId(),
      kind: tool.kind,
      x,
      z,
      width: tool.width,
      depth: tool.depth,
      height: tool.height,
      rotationY: 0,
    });

    setDecorItems((prev) => [...prev, item]);
    setSelectedDecorId(item.id);
  }

  function updateSelectedDecor(patch: Partial<DecorItem>) {
    if (!selectedDecorId) return;
    setDecorItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedDecorId) return item;
        return sanitizeDecorItem({
          ...item,
          ...patch,
          x: patch.x != null ? clampCoord(patch.x) : item.x,
          z: patch.z != null ? clampCoord(patch.z) : item.z,
        });
      })
    );
  }

  function removeSelectedDecor() {
    if (!selectedDecorId) return;
    setDecorItems((prev) => prev.filter((item) => item.id !== selectedDecorId));
    setSelectedDecorId(null);
  }

  function clearAllDecor() {
    setDecorItems([]);
    setSelectedDecorId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          <Button
            variant={view === "3d" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setView("3d")}
          >
            <Box className="size-3.5" />
            3D 뷰
          </Button>
          <Button
            variant={view === "2d" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setView("2d")}
          >
            <LayoutGrid className="size-3.5" />
            2D 뷰
          </Button>
        </div>

        {view === "3d" && (
          <Button
            variant={visualMode === "bright" ? "default" : "outline"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() =>
              setVisualMode((prev) => (prev === "dark" ? "bright" : "dark"))
            }
          >
            {visualMode === "bright" ? (
              <Lightbulb className="size-3.5" />
            ) : (
              <LightbulbOff className="size-3.5" />
            )}
            {visualMode === "bright" ? "밝은 모드" : "어두운 모드"}
          </Button>
        )}

        {view === "3d" && (
          <Button
            variant={editorMode ? "default" : "outline"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditorMode((prev) => !prev)}
          >
            <Hammer className="size-3.5" />
            {editorMode ? "편집 모드 ON" : "편집 모드 OFF"}
          </Button>
        )}

        {view === "3d" && (
          <Badge variant="secondary" className="h-7 px-2 text-xs">
            배치 오브젝트 {decorItems.length}개
          </Badge>
        )}
      </div>

      {view === "3d" && editorMode && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">오브젝트</Label>
              <div className="flex gap-1">
                {([
                  ["box", "상자"],
                  ["pallet", "팔렛트"],
                  ["shelf", "선반"],
                ] as [DecorKind, string][]).map(([kind, label]) => (
                  <Button
                    key={kind}
                    variant={tool.kind === kind ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setKind(kind)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">가로(1~10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={tool.width}
                  onChange={(e) => updateTool("width", Number(e.target.value))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">세로(1~10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={tool.depth}
                  onChange={(e) => updateTool("depth", Number(e.target.value))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">높이(1~10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={tool.height}
                  onChange={(e) => updateTool("height", Number(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>

            {selectedDecor ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">X 위치</Label>
                  <Input
                    type="number"
                    value={selectedDecor.x}
                    onChange={(e) =>
                      updateSelectedDecor({ x: Number(e.target.value) })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Z 위치</Label>
                  <Input
                    type="number"
                    value={selectedDecor.z}
                    onChange={(e) =>
                      updateSelectedDecor({ z: Number(e.target.value) })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">회전</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full gap-1.5 text-xs"
                    onClick={() =>
                      updateSelectedDecor({
                        rotationY: (selectedDecor.rotationY + Math.PI / 2) % (Math.PI * 2),
                      })
                    }
                  >
                    <RotateCw className="size-3.5" />
                    90도
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                바닥 클릭: 오브젝트 배치
                <br />
                오브젝트 클릭: 선택 후 위치/회전 수정
              </div>
            )}

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={removeSelectedDecor}
                disabled={!selectedDecorId}
              >
                <Trash2 className="size-3.5" />
                선택 삭제
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={clearAllDecor}
                disabled={decorItems.length === 0}
              >
                전체 초기화
              </Button>
            </div>
          </div>
        </div>
      )}

      {view === "3d" ? (
        <WarehouseMap3D
          editorMode={editorMode}
          visualMode={visualMode}
          decorItems={decorItems}
          selectedDecorId={selectedDecorId}
          onSelectDecor={setSelectedDecorId}
          onPlaceDecor={placeDecorAt}
        />
      ) : (
        <WarehouseMapPanel />
      )}
    </div>
  );
}
