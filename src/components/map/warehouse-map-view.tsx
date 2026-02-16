"use client";

import {
  Box,
  LayoutGrid,
  Hammer,
  Trash2,
  RotateCw,
  Lightbulb,
  LightbulbOff,
  Save,
  LogOut,
  Undo2,
  Redo2,
  Copy,
  Grid3x3,
  HelpCircle,
  Timer,
  Sparkles,
  Search,
  X,
  MapPin,
  Loader2,
  Palette,
  SlidersHorizontal,
  Zap,
  Thermometer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WarehouseMap3D } from "./warehouse-map-3d";
import { WarehouseMapPanel } from "./warehouse-map-panel";
import { EditorModals } from "./editor-modals";
import { InventoryCellPanel } from "./inventory-cell-panel";
import { EditorProvider, useEditor } from "@/lib/editor-context";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DecorKind } from "@/lib/map-layout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WarehouseCell } from "@/lib/types/database";
import { toast } from "sonner";
import { buildLocationCode } from "@/lib/location-system";

/* ------------------------------------------------------------------ */
/*  Responsive Tooltip wrapper — no-op on touch devices                */
/* ------------------------------------------------------------------ */

function ResponsiveTooltip({
  label,
  children,
  isMobile,
}: {
  label: string;
  children: React.ReactElement;
  isMobile: boolean;
}) {
  if (isMobile) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/*  Timer Display                                                      */
/* ------------------------------------------------------------------ */

function TimerBadge({ compact }: { compact?: boolean }) {
  const { elapsedSeconds, targetSeconds, editorMode } = useEditor();
  if (!editorMode) return null;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const pct = Math.min(100, (elapsedSeconds / targetSeconds) * 100);
  const isWarning = elapsedSeconds >= 270;
  const isOver = elapsedSeconds >= targetSeconds;

  return (
    <Badge
      variant="secondary"
      className={`h-7 gap-1.5 px-2 text-xs font-mono ${
        isOver
          ? "border-red-500/50 text-red-500"
          : isWarning
            ? "border-amber-500/50 text-amber-500"
            : ""
      }`}
    >
      <Timer className="size-3" />
      {mins}:{secs.toString().padStart(2, "0")}
      {!compact && <span className="text-muted-foreground">/ 5:00</span>}
      <div className="ml-1 h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Editor Tab Types                                            */
/* ------------------------------------------------------------------ */

type MobileEditorTab = "palette" | "properties" | "actions";

/* ------------------------------------------------------------------ */
/*  Editor Toolbar — Desktop (unchanged layout, responsive tooltips)   */
/* ------------------------------------------------------------------ */

function EditorToolbarDesktop({
  selectedCell,
  updateCellField,
  saveCellChanges,
  confirmDeleteCell,
  cellSaving,
}: {
  selectedCell: WarehouseCell | null;
  updateCellField: (field: string, value: number | string) => void;
  saveCellChanges: () => Promise<void>;
  confirmDeleteCell: () => Promise<void>;
  cellSaving: boolean;
}) {
  const {
    editorMode,
    tool,
    setKind,
    updateTool,
    selectedDecor,
    updateSelectedDecor,
    setShowDeleteModal,
    setShowClearModal,
    duplicateSelectedDecor,
    undo,
    redo,
    canUndo,
    canRedo,
    snapToGrid,
    setSnapToGrid,
    beginnerMode,
    setBeginnerMode,
    decorItems,
    hasChanges,
    selectedDecorId,
    resetToDefaultLayout,
  } = useEditor();

  if (!editorMode) return null;

  const KINDS: [DecorKind, string][] = [
    ["box", "상자"],
    ["pallet", "팔렛트"],
    ["shelf", "선반"],
  ];

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      {/* Row 1: Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="size-3.5" />
              <span className="hidden sm:inline">실행 취소</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>실행 취소 (Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="size-3.5" />
              <span className="hidden sm:inline">다시 실행</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>다시 실행 (Shift+Z)</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={snapToGrid ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setSnapToGrid(!snapToGrid)}
            >
              <Grid3x3 className="size-3.5" />
              스냅
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            그리드 스냅 {snapToGrid ? "ON" : "OFF"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={beginnerMode ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setBeginnerMode(!beginnerMode)}
            >
              <Sparkles className="size-3.5" />
              간편
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            초보자 모드: 간편한 프리셋 배치
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="h-7 px-2 text-xs">
            배치 {decorItems.length}개
          </Badge>
          {hasChanges && (
            <Badge
              variant="secondary"
              className="h-7 border-amber-500/50 px-2 text-xs text-amber-500"
            >
              미저장
            </Badge>
          )}
        </div>
      </div>

      {/* Row 2: Object tools & properties */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* Object type selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">오브젝트</Label>
          <div className="flex gap-1">
            {KINDS.map(([kind, label]) => (
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

        {/* Dimension inputs */}
        {!beginnerMode && (
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
        )}

        {/* Selected object position/rotation */}
        {selectedDecor ? (
          <div className="grid grid-cols-3 gap-2">
            {!beginnerMode && (
              <>
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
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">회전</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs"
                onClick={() =>
                  updateSelectedDecor({
                    rotationY:
                      (selectedDecor.rotationY + Math.PI / 2) % (Math.PI * 2),
                  })
                }
              >
                <RotateCw className="size-3.5" />
                90도
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-xs text-muted-foreground">
            바닥 클릭: 오브젝트 배치
            <br />
            오브젝트 클릭: 선택 후 수정
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={duplicateSelectedDecor}
                disabled={!selectedDecorId}
              >
                <Copy className="size-3.5" />
                복제
              </Button>
            </TooltipTrigger>
            <TooltipContent>복제 (C)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowDeleteModal(true)}
                disabled={!selectedDecorId}
              >
                <Trash2 className="size-3.5" />
                삭제
              </Button>
            </TooltipTrigger>
            <TooltipContent>삭제 (Delete)</TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowClearModal(true)}
            disabled={decorItems.length === 0}
          >
            전체 초기화
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={resetToDefaultLayout}
          >
            <LayoutGrid className="size-3.5" />
            기본 레이아웃
          </Button>
        </div>
      </div>

      {/* Cell Properties Panel — shows when a cell is selected in editor mode */}
      {selectedCell && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">셀 속성</Label>
            <Badge variant="secondary" className="text-[10px]">
              {selectedCell.cell_type === 'shelf' ? '선반' :
               selectedCell.cell_type === 'cold' ? '냉장' :
               selectedCell.cell_type === 'empty' ? '빈칸' : '예약'}
            </Badge>
          </div>

          {/* Position */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">X</Label>
              <Input
                type="number"
                step="0.1"
                value={selectedCell.pos_x}
                onChange={e => updateCellField('pos_x', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Y</Label>
              <Input
                type="number"
                step="0.1"
                value={selectedCell.pos_y}
                onChange={e => updateCellField('pos_y', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Z</Label>
              <Input
                type="number"
                step="0.1"
                value={selectedCell.pos_z}
                onChange={e => updateCellField('pos_z', Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">너비</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={selectedCell.width}
                onChange={e => updateCellField('width', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">높이</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={selectedCell.height}
                onChange={e => updateCellField('height', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">깊이</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={selectedCell.depth}
                onChange={e => updateCellField('depth', Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>

          {/* Cell Type */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">셀 타입</Label>
            <div className="flex gap-1">
              {(['shelf', 'cold', 'empty', 'reserved'] as const).map(type => (
                <Button
                  key={type}
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  variant={selectedCell.cell_type === type ? 'default' : 'outline'}
                  onClick={() => updateCellField('cell_type', type)}
                >
                  {type === 'shelf' ? '선반' : type === 'cold' ? '냉장' : type === 'empty' ? '빈칸' : '예약'}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={saveCellChanges}
              disabled={cellSaving}
            >
              {cellSaving ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Save className="mr-1 size-3" />}
              셀 저장
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={confirmDeleteCell}
            >
              <Trash2 className="mr-1 size-3" /> 삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Editor Toolbar — Mobile bottom sheet tab contents                   */
/* ------------------------------------------------------------------ */

function MobilePaletteTab() {
  const {
    tool,
    setKind,
    updateTool,
    snapToGrid,
    setSnapToGrid,
    beginnerMode,
    setBeginnerMode,
    decorItems,
  } = useEditor();

  const KINDS: [DecorKind, string][] = [
    ["box", "상자"],
    ["pallet", "팔렛트"],
    ["shelf", "선반"],
  ];

  return (
    <div className="space-y-4 p-3">
      {/* Object type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">오브젝트 종류</Label>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map(([kind, label]) => (
            <Button
              key={kind}
              variant={tool.kind === kind ? "default" : "outline"}
              className="h-11 text-sm"
              onClick={() => setKind(kind)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Dimensions (non-beginner) */}
      {!beginnerMode && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">크기 설정</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">가로</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={tool.width}
                onChange={(e) => updateTool("width", Number(e.target.value))}
                className="h-10 text-center"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">세로</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={tool.depth}
                onChange={(e) => updateTool("depth", Number(e.target.value))}
                className="h-10 text-center"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">높이</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={tool.height}
                onChange={(e) => updateTool("height", Number(e.target.value))}
                className="h-10 text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="flex gap-2">
        <Button
          variant={snapToGrid ? "default" : "outline"}
          className="h-11 flex-1 gap-2 text-sm"
          onClick={() => setSnapToGrid(!snapToGrid)}
        >
          <Grid3x3 className="size-4" />
          스냅 {snapToGrid ? "ON" : "OFF"}
        </Button>
        <Button
          variant={beginnerMode ? "default" : "outline"}
          className="h-11 flex-1 gap-2 text-sm"
          onClick={() => setBeginnerMode(!beginnerMode)}
        >
          <Sparkles className="size-4" />
          간편모드
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        배치된 오브젝트: {decorItems.length}개
      </div>
    </div>
  );
}

function MobilePropertiesTab() {
  const {
    selectedDecor,
    updateSelectedDecor,
    beginnerMode,
    selectedDecorId,
  } = useEditor();

  if (!selectedDecor) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <SlidersHorizontal className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          오브젝트를 탭하여 선택하세요
        </p>
        <p className="text-xs text-muted-foreground/60">
          바닥 탭: 배치 | 오브젝트 탭: 선택
        </p>
      </div>
    );
  }

  const kindLabel =
    selectedDecor.kind === "box"
      ? "상자"
      : selectedDecor.kind === "pallet"
        ? "팔렛트"
        : "선반";

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {kindLabel}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">
          #{selectedDecor.id.slice(0, 6)}
        </span>
      </div>

      {/* Position (non-beginner) */}
      {!beginnerMode && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">X 위치</Label>
            <Input
              type="number"
              value={selectedDecor.x}
              onChange={(e) =>
                updateSelectedDecor({ x: Number(e.target.value) })
              }
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Z 위치</Label>
            <Input
              type="number"
              value={selectedDecor.z}
              onChange={(e) =>
                updateSelectedDecor({ z: Number(e.target.value) })
              }
              className="h-10"
            />
          </div>
        </div>
      )}

      {/* Rotation */}
      <Button
        variant="outline"
        className="h-11 w-full gap-2 text-sm"
        onClick={() =>
          updateSelectedDecor({
            rotationY:
              (selectedDecor.rotationY + Math.PI / 2) % (Math.PI * 2),
          })
        }
      >
        <RotateCw className="size-4" />
        90도 회전
      </Button>
    </div>
  );
}

function MobileActionsTab() {
  const {
    duplicateSelectedDecor,
    setShowDeleteModal,
    setShowClearModal,
    setShowSaveModal,
    discardChanges,
    requestExit,
    resetToDefaultLayout,
    selectedDecorId,
    decorItems,
    hasChanges,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditor();

  return (
    <div className="space-y-3 p-3">
      {/* Undo/redo */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm"
          onClick={undo}
          disabled={!canUndo}
        >
          <Undo2 className="size-4" />
          실행 취소
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm"
          onClick={redo}
          disabled={!canRedo}
        >
          <Redo2 className="size-4" />
          다시 실행
        </Button>
      </div>

      {/* Object actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm"
          onClick={duplicateSelectedDecor}
          disabled={!selectedDecorId}
        >
          <Copy className="size-4" />
          복제
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm text-destructive"
          onClick={() => setShowDeleteModal(true)}
          disabled={!selectedDecorId}
        >
          <Trash2 className="size-4" />
          삭제
        </Button>
      </div>

      <div className="h-px bg-border" />

      {/* Save / Cancel / Exit */}
      <Button
        variant="default"
        className="h-11 w-full gap-2 text-sm"
        onClick={() => setShowSaveModal(true)}
        disabled={!hasChanges}
      >
        <Save className="size-4" />
        저장
      </Button>

      <Button
        variant="outline"
        className="h-11 w-full gap-2 text-sm"
        onClick={resetToDefaultLayout}
      >
        <LayoutGrid className="size-4" />
        기본 레이아웃
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm"
          onClick={() => setShowClearModal(true)}
          disabled={decorItems.length === 0}
        >
          전체 초기화
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm"
          onClick={discardChanges}
          disabled={!hasChanges}
        >
          취소
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 text-sm"
          onClick={() => requestExit()}
        >
          <LogOut className="size-4" />
          나가기
        </Button>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  Mobile Bottom Tab Bar                                              */
/* ------------------------------------------------------------------ */

function MobileEditorBar() {
  const { editorMode, hasChanges, decorItems } = useEditor();
  const [activeTab, setActiveTab] = useState<MobileEditorTab | null>(null);

  if (!editorMode) return null;

  const tabs: { id: MobileEditorTab; icon: typeof Palette; label: string }[] = [
    { id: "palette", icon: Palette, label: "팔레트" },
    { id: "properties", icon: SlidersHorizontal, label: "속성" },
    { id: "actions", icon: Zap, label: "액션" },
  ];

  return (
    <>
      {/* Expandable panel (slides up from bottom bar) */}
      {activeTab && (
        <div className="rounded-lg border bg-background shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">
                {tabs.find((t) => t.id === activeTab)?.label}
              </span>
              <TimerBadge compact />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => setActiveTab(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="max-h-[40vh] overflow-y-auto overscroll-contain">
            {activeTab === "palette" && <MobilePaletteTab />}
            {activeTab === "properties" && <MobilePropertiesTab />}
            {activeTab === "actions" && <MobileActionsTab />}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[11px] transition-colors ${
              activeTab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground active:bg-muted"
            }`}
            onClick={() => setActiveTab(activeTab === id ? null : id)}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}

        {/* Status indicators */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {decorItems.length}
          </Badge>
          {hasChanges && (
            <span className="size-2 rounded-full bg-amber-500" />
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Search Types                                                  */
/* ------------------------------------------------------------------ */

type SearchResult = {
  productName: string;
  productSku: string;
  locationCode: string;
  quantity: number;
  minQuantity: number;
};

/* ------------------------------------------------------------------ */
/*  useItemSearch hook                                                  */
/* ------------------------------------------------------------------ */

function useItemSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightedCodes = useMemo(() => {
    if (results.length === 0) return undefined;
    return new Set(results.map((r) => r.locationCode));
  }, [results]);

  const search = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/locations/item-search?q=${encodeURIComponent(q.trim())}`
        );
        if (res.ok) {
          const json = (await res.json()) as { data: SearchResult[] };
          setResults(json.data ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { query, results, isSearching, highlightedCodes, search, clear };
}

/* ------------------------------------------------------------------ */
/*  Search Bar Component                                               */
/* ------------------------------------------------------------------ */

function ItemSearchBar({
  query,
  results,
  isSearching,
  onSearch,
  onClear,
}: {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  onSearch: (q: string) => void;
  onClear: () => void;
}) {
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click / touch
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full md:max-w-md">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="아이템 검색 (이름 또는 SKU)..."
          value={query}
          onChange={(e) => {
            onSearch(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => query && setShowResults(true)}
          className="h-9 pl-8 pr-8 text-sm md:h-8 md:text-xs"
        />
        {isSearching && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setShowResults(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && query && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg border bg-popover p-1 shadow-lg">
          <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {results.length}개 위치에서 발견
          </div>
          {results.map((r, i) => (
            <div
              key={`${r.locationCode}-${r.productSku}-${i}`}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-xs active:bg-accent md:py-1.5 md:hover:bg-accent"
            >
              <MapPin className="size-3 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0 truncate">
                <span className="font-medium">{r.productName}</span>
                <span className="ml-1.5 text-muted-foreground">
                  ({r.productSku})
                </span>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-mono"
              >
                {r.locationCode}
              </Badge>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {r.quantity}개
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && query && !isSearching && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover p-3 shadow-lg">
          <p className="text-xs text-muted-foreground text-center">
            &quot;{query}&quot;에 대한 검색 결과가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main View (inner, uses context)                                    */
/* ------------------------------------------------------------------ */

function WarehouseMapViewInner() {
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [temperature, setTemperature] = useState(20);
  const isMobile = useIsMobile();
  const temperatureSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cell editing state
  const [selectedCell, setSelectedCell] = useState<WarehouseCell | null>(null);
  const [cellSaving, setCellSaving] = useState(false);

  // Inventory panel state (view mode - non-editor)
  const [inventoryPanelOpen, setInventoryPanelOpen] = useState(false);
  const [inventoryLocationCode, setInventoryLocationCode] = useState<string | null>(null);
  const [inventoryCellId, setInventoryCellId] = useState<string | null>(null);

  // Editor context - destructured early so hooks below can reference editorMode
  const {
    editorMode,
    setEditorMode,
    visualMode,
    setVisualMode,
    decorItems,
    selectedDecorId,
    selectDecor,
    placeDecorAt,
    hasChanges,
    layoutLoading,
    layoutSaving,
    discardChanges,
    requestExit,
    setShowSaveModal,
    setShowHelpModal,
  } = useEditor();

  // Load persisted temperature from DB on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/warehouse-settings?key=temperature")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { celsius?: number } } | null) => {
        if (cancelled || json?.data?.celsius == null) return;
        setTemperature(json.data.celsius);
      })
      .catch(() => {
        // Silent — fall back to default 20 deg C
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced save: persist temperature to DB 800ms after the user stops dragging
  const handleTemperatureChange = useCallback((value: number) => {
    setTemperature(value);
    if (temperatureSaveRef.current) clearTimeout(temperatureSaveRef.current);
    temperatureSaveRef.current = setTimeout(() => {
      fetch("/api/admin/warehouse-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "temperature",
          value: { celsius: value },
        }),
      }).catch(() => {
        // Silent — temperature is non-critical UI state
      });
    }, 800);
  }, []);

  // Clean up pending save timeout on unmount
  useEffect(() => {
    return () => {
      if (temperatureSaveRef.current) clearTimeout(temperatureSaveRef.current);
    };
  }, []);

  /* ----- Cell CRUD Functions ----- */

  function updateCellField(field: string, value: number | string) {
    if (!selectedCell) return;
    setSelectedCell({ ...selectedCell, [field]: value });
  }

  async function saveCellChanges() {
    if (!selectedCell) return;
    setCellSaving(true);
    try {
      const res = await fetch(`/api/warehouse-cells/${selectedCell.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pos_x: selectedCell.pos_x,
          pos_y: selectedCell.pos_y,
          pos_z: selectedCell.pos_z,
          width: selectedCell.width,
          height: selectedCell.height,
          depth: selectedCell.depth,
          cell_type: selectedCell.cell_type,
        }),
      });
      if (!res.ok) throw new Error('저장 실패');
      toast.success('셀 저장 완료');
      // TODO: trigger 3D scene refresh when MWU-D is implemented
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '셀 저장 실패');
    } finally {
      setCellSaving(false);
    }
  }

  async function confirmDeleteCell() {
    if (!selectedCell) return;
    // Simple confirm for now
    if (!confirm(`이 셀을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/warehouse-cells/${selectedCell.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제 실패');
      toast.success('셀 삭제 완료');
      setSelectedCell(null);
      // Trigger refresh — parent will reload cells
      window.dispatchEvent(new CustomEvent('cells-changed'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '셀 삭제 실패');
    }
  }

  // Handle cell click in view mode (non-editor) - open inventory panel
  function handleViewModeSelectCell(cell: WarehouseCell | null) {
    if (!cell) {
      setInventoryPanelOpen(false);
      setInventoryLocationCode(null);
      setInventoryCellId(null);
      return;
    }

    // Build location code from cell's face_no, bay_no, level_no OR use cell.code if available
    let code: string | null = null;

    if (cell.code) {
      // Prefer cell.code if it exists (set in temp cells)
      code = cell.code;
    } else if (cell.face_no != null && cell.bay_no != null && cell.level_no != null) {
      // Fall back to building from coordinates
      code = buildLocationCode(cell.face_no, cell.bay_no, cell.level_no);
    }

    if (code) {
      setInventoryLocationCode(code);
      // Only pass cell ID if it's a real UUID (non-empty)
      setInventoryCellId(cell.id && cell.id.length > 0 ? cell.id : null);
      setInventoryPanelOpen(true);
    }
  }

  // Keyboard handler for Delete key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!editorMode || !selectedCell) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        confirmDeleteCell();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorMode, selectedCell]); // eslint-disable-line react-hooks/exhaustive-deps

  const { query, results, isSearching, highlightedCodes, search, clear } =
    useItemSearch();

  useEditorShortcuts();

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Search bar */}
      <ItemSearchBar
        query={query}
        results={results}
        isSearching={isSearching}
        onSearch={search}
        onClear={clear}
      />

      {/* Temperature control */}
      <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Thermometer
            className={`size-4 ${temperature <= 5 ? "text-sky-500" : "text-muted-foreground"}`}
          />
          <Label className="text-xs font-medium whitespace-nowrap">창고 온도</Label>
        </div>
        <Slider
          value={[temperature]}
          onValueChange={([v]) => handleTemperatureChange(v)}
          min={-20}
          max={40}
          step={1}
          className="w-32 md:w-48"
        />
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
            temperature <= 5
              ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400"
              : "bg-muted text-foreground"
          }`}
        >
          {temperature}°C
          {temperature <= 5 && (
            <span className="text-[10px] font-medium text-sky-500">냉장</span>
          )}
        </div>
      </div>

      {/* Top bar — compact on mobile */}
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5 md:gap-1 md:p-1">
          <Button
            variant={view === "3d" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1 px-2 text-xs md:h-7 md:gap-1.5"
            onClick={() => setView("3d")}
          >
            <Box className="size-3.5" />
            <span className="hidden xs:inline">3D</span>
          </Button>
          <Button
            variant={view === "2d" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1 px-2 text-xs md:h-7 md:gap-1.5"
            onClick={() => setView("2d")}
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden xs:inline">2D</span>
          </Button>
        </div>

        {/* Visual mode */}
        {view === "3d" && (
          <ResponsiveTooltip
            label={visualMode === "bright" ? "어두운 모드로" : "밝은 모드로"}
            isMobile={isMobile}
          >
            <Button
              variant={visualMode === "bright" ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1 px-2 text-xs md:h-7 md:gap-1.5"
              onClick={() =>
                setVisualMode(visualMode === "dark" ? "bright" : "dark")
              }
            >
              {visualMode === "bright" ? (
                <Lightbulb className="size-3.5" />
              ) : (
                <LightbulbOff className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {visualMode === "bright" ? "밝은 모드" : "어두운 모드"}
              </span>
            </Button>
          </ResponsiveTooltip>
        )}

        {/* Editor mode toggle */}
        {view === "3d" && !editorMode && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2 text-xs md:h-7 md:gap-1.5"
            onClick={() => setEditorMode(true)}
          >
            <Hammer className="size-3.5" />
            <span className="hidden sm:inline">편집 모드</span>
            <span className="sm:hidden">편집</span>
          </Button>
        )}

        {/* Editor active controls — DESKTOP only for top bar extras */}
        {view === "3d" && editorMode && (
          <>
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1 px-2 text-xs md:h-7 md:gap-1.5"
              onClick={() => requestExit()}
            >
              <Hammer className="size-3.5" />
              <span className="hidden sm:inline">편집 중</span>
            </Button>

            {/* Desktop-only save/exit/help in top bar */}
            {!isMobile && (
              <>
                <div className="h-5 w-px bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setShowSaveModal(true)}
                      disabled={!hasChanges || layoutSaving}
                    >
                      <Save className="size-3.5" />
                      {layoutSaving ? "저장 중" : "저장"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>저장 (Ctrl+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={discardChanges}
                      disabled={!hasChanges || layoutSaving}
                    >
                      취소
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>저장 전 상태로 되돌리기</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => requestExit()}
                      disabled={layoutSaving}
                    >
                      <LogOut className="size-3.5" />
                      나가기
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>편집 모드 종료</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setShowHelpModal(true)}
                    >
                      <HelpCircle className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>단축키 도움말 (?)</TooltipContent>
                </Tooltip>

                <TimerBadge />
              </>
            )}

            {/* Mobile: compact timer only in top bar */}
            {isMobile && <TimerBadge compact />}
          </>
        )}

        {/* Object count (non-editor) */}
        {view === "3d" && !editorMode && decorItems.length > 0 && (
          <Badge variant="secondary" className="h-7 px-2 text-xs">
            <span className="hidden sm:inline">배치 오브젝트 </span>
            {decorItems.length}개
          </Badge>
        )}

        {/* Search result count indicator */}
        {highlightedCodes && highlightedCodes.size > 0 && (
          <Badge
            variant="secondary"
            className="h-7 gap-1 border-amber-500/50 px-2 text-xs text-amber-500"
          >
            <MapPin className="size-3" />
            {highlightedCodes.size}개
            <span className="hidden sm:inline"> 위치 하이라이트</span>
          </Badge>
        )}
      </div>

      {/* Editor toolbar — desktop only */}
      {view === "3d" && !isMobile && (
        <EditorToolbarDesktop
          selectedCell={selectedCell}
          updateCellField={updateCellField}
          saveCellChanges={saveCellChanges}
          confirmDeleteCell={confirmDeleteCell}
          cellSaving={cellSaving}
        />
      )}

      {/* 3D / 2D content */}
      <div className="relative">
        {view === "3d" ? (
          <WarehouseMap3D
            editorMode={editorMode}
            visualMode={visualMode}
            decorItems={decorItems}
            selectedDecorId={selectedDecorId}
            onSelectDecor={selectDecor}
            onPlaceDecor={placeDecorAt}
            highlightedCodes={highlightedCodes}
            temperature={temperature}
            selectedCell={selectedCell}
            onSelectCell={editorMode ? setSelectedCell : handleViewModeSelectCell}
          />
        ) : (
          <WarehouseMapPanel
            temperature={temperature}
            onTemperatureChange={handleTemperatureChange}
          />
        )}

        {view === "3d" && (layoutLoading || layoutSaving) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/55 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-md border border-cyan-500/40 bg-black/75 px-4 py-2 text-sm text-cyan-200">
              <Loader2 className="size-4 animate-spin" />
              {layoutSaving ? "레이아웃 저장 중..." : "레이아웃 불러오는 중..."}
            </div>
          </div>
        )}
      </div>

      {/* Editor mobile bottom bar */}
      {view === "3d" && isMobile && <MobileEditorBar />}

      {/* Modals */}
      <EditorModals />

      {/* Inventory Panel (view mode only) */}
      {!editorMode && (
        <InventoryCellPanel
          locationCode={inventoryLocationCode}
          cellId={inventoryCellId}
          isOpen={inventoryPanelOpen}
          onClose={() => {
            setInventoryPanelOpen(false);
            setInventoryLocationCode(null);
            setInventoryCellId(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Outer wrapper with provider                                        */
/* ------------------------------------------------------------------ */

export function WarehouseMapView() {
  return (
    <EditorProvider>
      <WarehouseMapViewInner />
    </EditorProvider>
  );
}




