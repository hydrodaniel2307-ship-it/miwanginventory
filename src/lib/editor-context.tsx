"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  DEFAULT_TOOL_BY_KIND,
  clampCoord,
  clampSize,
  makeDecorId,
  sanitizeDecorItem,
  type DecorItem,
  type DecorKind,
  type DecorTool,
} from "@/lib/map-layout";

const DEFAULT_WAREHOUSE_ID = "main";
const TARGET_SECONDS = 300;
const WARNING_THRESHOLD = 270;
const MAX_UNDO_DEPTH = 50;
const LAYOUT_FETCH_TIMEOUT_MS = 8000;

type LayoutGetResponse = {
  data?: {
    warehouseId: string;
    version: number;
    updatedAt: string | null;
    items: unknown[];
  };
  error?: string;
};

type LayoutSaveResponse = {
  data?: {
    warehouseId: string;
    version: number;
    updatedAt: string | null;
    items: unknown[];
  };
  error?: string;
};

export type EditorState =
  | "viewing"
  | "editing"
  | "saving"
  | "loading"
  | "error"
  | "exit_warning";

export type EditorContextType = {
  editorState: EditorState;
  editorMode: boolean;
  layoutLoading: boolean;
  layoutSaving: boolean;
  layoutError: string | null;
  visualMode: "dark" | "bright";
  snapToGrid: boolean;
  beginnerMode: boolean;

  decorItems: DecorItem[];
  selectedDecorId: string | null;
  selectedDecor: DecorItem | null;
  tool: DecorTool;
  hasChanges: boolean;

  canUndo: boolean;
  canRedo: boolean;

  elapsedSeconds: number;
  targetSeconds: number;
  version: number;
  updatedAt: string | null;

  setEditorMode: (v: boolean) => void;
  setVisualMode: (v: "dark" | "bright") => void;
  setSnapToGrid: (v: boolean) => void;
  setBeginnerMode: (v: boolean) => void;
  setTool: (tool: DecorTool) => void;
  setKind: (kind: DecorKind) => void;
  updateTool: (field: keyof DecorTool, value: number) => void;

  placeDecorAt: (x: number, z: number) => void;
  selectDecor: (id: string | null) => void;
  updateSelectedDecor: (patch: Partial<DecorItem>) => void;
  duplicateSelectedDecor: () => void;
  removeSelectedDecor: () => void;
  clearAllDecor: () => void;

  undo: () => void;
  redo: () => void;

  saveLayout: () => Promise<boolean>;
  reloadLayout: () => Promise<void>;
  discardChanges: () => void;
  requestExit: () => void;
  confirmExit: () => void;
  cancelExit: () => void;

  showSaveModal: boolean;
  setShowSaveModal: (v: boolean) => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (v: boolean) => void;
  showClearModal: boolean;
  setShowClearModal: (v: boolean) => void;
  showExitModal: boolean;
  setShowExitModal: (v: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (v: boolean) => void;
};

const EditorContext = createContext<EditorContextType | null>(null);

export function useEditor(): EditorContextType {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

function parseDecorItems(input: unknown): DecorItem[] {
  if (!Array.isArray(input)) return [];

  const parsed: DecorItem[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<DecorItem>;

    if (
      typeof item.id !== "string" ||
      !item.id ||
      (item.kind !== "box" && item.kind !== "pallet" && item.kind !== "shelf")
    ) {
      continue;
    }

    if (
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.z) ||
      !Number.isFinite(item.width) ||
      !Number.isFinite(item.depth) ||
      !Number.isFinite(item.height) ||
      !Number.isFinite(item.rotationY)
    ) {
      continue;
    }

    parsed.push(sanitizeDecorItem(item as DecorItem));
  }

  return parsed;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [editorMode, setEditorModeRaw] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [visualMode, setVisualMode] = useState<"dark" | "bright">("dark");
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [tool, setTool] = useState<DecorTool>(DEFAULT_TOOL_BY_KIND.box);

  const [decorItems, setDecorItemsRaw] = useState<DecorItem[]>([]);
  const [undoStack, setUndoStack] = useState<DecorItem[][]>([]);
  const [redoStack, setRedoStack] = useState<DecorItem[][]>([]);
  const savedSnapshotRef = useRef<string>("[]");

  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);
  const [changeCounter, setChangeCounter] = useState(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const hasChanges = changeCounter > 0;

  const selectedDecor = useMemo(
    () => decorItems.find((item) => item.id === selectedDecorId) ?? null,
    [decorItems, selectedDecorId]
  );

  const editorState: EditorState = showExitModal
    ? "exit_warning"
    : layoutLoading
      ? "loading"
      : layoutSaving
        ? "saving"
        : layoutError
          ? "error"
          : editorMode
            ? "editing"
            : "viewing";

  const decorItemsRef = useRef(decorItems);
  decorItemsRef.current = decorItems;

  const pushUndo = useCallback((prev: DecorItem[]) => {
    setUndoStack((stack) => [...stack.slice(-(MAX_UNDO_DEPTH - 1)), prev]);
    setRedoStack([]);
  }, []);

  const setDecorItems = useCallback(
    (updater: DecorItem[] | ((prev: DecorItem[]) => DecorItem[])) => {
      setDecorItemsRaw((prev) => {
        pushUndo(prev);
        return typeof updater === "function" ? updater(prev) : updater;
      });
      setChangeCounter((counter) => counter + 1);
    },
    [pushUndo]
  );

  const loadLayout = useCallback(async () => {
    setLayoutLoading(true);
    setLayoutError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LAYOUT_FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(
        `/api/editor/layout?warehouse=${encodeURIComponent(DEFAULT_WAREHOUSE_ID)}`,
        { cache: "no-store", signal: controller.signal }
      );
      const payload = (await res.json().catch(() => null)) as LayoutGetResponse | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "레이아웃을 불러오지 못했습니다.");
      }

      const items = parseDecorItems(payload?.data?.items ?? []);

      setDecorItemsRaw(items);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedDecorId(null);
      setChangeCounter(0);
      setVersion(payload?.data?.version ?? 1);
      setUpdatedAt(payload?.data?.updatedAt ?? null);
      savedSnapshotRef.current = JSON.stringify(items);
    } catch (error) {
      const message = error instanceof Error
        ? (error.name === "AbortError"
          ? "레이아웃 로딩 시간이 초과되었습니다. 잠시 후 다시 시도하세요."
          : error.message)
        : "레이아웃을 불러오지 못했습니다.";
      setLayoutError(message);
    } finally {
      clearTimeout(timeout);
      setLayoutLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  const setEditorMode = useCallback((enabled: boolean) => {
    if (enabled) {
      setEditorModeRaw(true);
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((seconds) => seconds + 1);
      }, 1000);
      return;
    }

    setEditorModeRaw(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    if (elapsedSeconds === WARNING_THRESHOLD && editorMode) {
      toast.warning("4분 30초 경과. 저장을 권장합니다.");
    }

    if (elapsedSeconds === TARGET_SECONDS && editorMode) {
      toast.info("5분 경과. 저장 후 편집을 마무리하세요.");
    }
  }, [elapsedSeconds, editorMode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function beforeUnloadHandler(event: BeforeUnloadEvent) {
      if (hasChanges && editorMode) {
        event.preventDefault();
      }
    }

    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => window.removeEventListener("beforeunload", beforeUnloadHandler);
  }, [hasChanges, editorMode]);

  const setKind = useCallback((kind: DecorKind) => {
    setTool({ ...DEFAULT_TOOL_BY_KIND[kind] });
  }, []);

  const updateTool = useCallback((field: keyof DecorTool, value: number) => {
    setTool((prev) => ({
      ...prev,
      [field]: field === "kind" ? prev.kind : clampSize(value),
    }));
  }, []);

  const snapRef = useRef(snapToGrid);
  snapRef.current = snapToGrid;

  const toolRef = useRef(tool);
  toolRef.current = tool;

  const placeDecorAt = useCallback(
    (x: number, z: number) => {
      const nextTool = toolRef.current;
      const finalX = snapRef.current ? Math.round(x) : x;
      const finalZ = snapRef.current ? Math.round(z) : z;

      const item: DecorItem = sanitizeDecorItem({
        id: makeDecorId(),
        kind: nextTool.kind,
        x: finalX,
        z: finalZ,
        width: nextTool.width,
        depth: nextTool.depth,
        height: nextTool.height,
        rotationY: 0,
      });

      setDecorItems((prev) => [...prev, item]);
      setSelectedDecorId(item.id);
    },
    [setDecorItems]
  );

  const selectDecor = useCallback((id: string | null) => {
    setSelectedDecorId(id);
  }, []);

  const selectedDecorIdRef = useRef(selectedDecorId);
  selectedDecorIdRef.current = selectedDecorId;

  const updateSelectedDecor = useCallback(
    (patch: Partial<DecorItem>) => {
      const currentId = selectedDecorIdRef.current;
      if (!currentId) return;

      setDecorItems((prev) =>
        prev.map((item) => {
          if (item.id !== currentId) return item;
          return sanitizeDecorItem({
            ...item,
            ...patch,
            x: patch.x != null ? clampCoord(patch.x) : item.x,
            z: patch.z != null ? clampCoord(patch.z) : item.z,
          });
        })
      );
    },
    [setDecorItems]
  );

  const duplicateSelectedDecor = useCallback(() => {
    setDecorItemsRaw((prev) => {
      const selected = prev.find((item) => item.id === selectedDecorIdRef.current);
      if (!selected) return prev;

      const duplicated: DecorItem = {
        ...selected,
        id: makeDecorId(),
        x: selected.x + 1,
        z: selected.z + 1,
      };

      pushUndo(prev);
      setChangeCounter((counter) => counter + 1);
      setSelectedDecorId(duplicated.id);
      toast.success("오브젝트를 복제했습니다.");
      return [...prev, duplicated];
    });
  }, [pushUndo]);

  const removeSelectedDecor = useCallback(() => {
    const currentId = selectedDecorIdRef.current;
    if (!currentId) return;

    setDecorItems((prev) => prev.filter((item) => item.id !== currentId));
    setSelectedDecorId(null);
  }, [setDecorItems]);

  const clearAllDecor = useCallback(() => {
    setDecorItems([]);
    setSelectedDecorId(null);
  }, [setDecorItems]);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;

      const previous = stack[stack.length - 1];
      setDecorItemsRaw((current) => {
        setRedoStack((redo) => [...redo, current]);
        return previous;
      });
      setChangeCounter((counter) => counter + 1);
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;

      const next = stack[stack.length - 1];
      setDecorItemsRaw((current) => {
        setUndoStack((undoRows) => [...undoRows, current]);
        return next;
      });
      setChangeCounter((counter) => counter + 1);
      return stack.slice(0, -1);
    });
  }, []);

  const saveLayout = useCallback(async () => {
    if (layoutSaving) return false;

    setLayoutSaving(true);
    setLayoutError(null);

    try {
      const res = await fetch("/api/editor/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: DEFAULT_WAREHOUSE_ID,
          items: decorItemsRef.current,
        }),
      });

      const payload = (await res.json().catch(() => null)) as LayoutSaveResponse | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "레이아웃 저장에 실패했습니다.");
      }

      savedSnapshotRef.current = JSON.stringify(decorItemsRef.current);
      setChangeCounter(0);
      setUndoStack([]);
      setRedoStack([]);
      setVersion((prev) => payload?.data?.version ?? prev + 1);
      setUpdatedAt(payload?.data?.updatedAt ?? new Date().toISOString());
      toast.success("레이아웃을 저장했습니다.");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "레이아웃 저장 중 오류가 발생했습니다.";
      setLayoutError(message);
      toast.error(message);
      return false;
    } finally {
      setLayoutSaving(false);
    }
  }, [layoutSaving]);

  const discardChanges = useCallback(() => {
    let restored: DecorItem[] = [];

    try {
      restored = parseDecorItems(JSON.parse(savedSnapshotRef.current));
    } catch {
      restored = [];
    }

    setDecorItemsRaw(restored);
    setSelectedDecorId(null);
    setUndoStack([]);
    setRedoStack([]);
    setChangeCounter(0);
    toast.info("변경 사항을 취소했습니다.");
  }, []);

  const requestExit = useCallback(() => {
    if (changeCounter > 0) {
      setShowExitModal(true);
      return;
    }

    setEditorMode(false);
    setSelectedDecorId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [changeCounter, setEditorMode]);

  const confirmExit = useCallback(() => {
    setShowExitModal(false);
    setEditorMode(false);
    setSelectedDecorId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [setEditorMode]);

  const cancelExit = useCallback(() => {
    setShowExitModal(false);
  }, []);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const value = useMemo<EditorContextType>(
    () => ({
      editorState,
      editorMode,
      layoutLoading,
      layoutSaving,
      layoutError,
      visualMode,
      snapToGrid,
      beginnerMode,
      decorItems,
      selectedDecorId,
      selectedDecor,
      tool,
      hasChanges,
      canUndo,
      canRedo,
      elapsedSeconds,
      targetSeconds: TARGET_SECONDS,
      version,
      updatedAt,
      setEditorMode,
      setVisualMode,
      setSnapToGrid,
      setBeginnerMode,
      setTool,
      setKind,
      updateTool,
      placeDecorAt,
      selectDecor,
      updateSelectedDecor,
      duplicateSelectedDecor,
      removeSelectedDecor,
      clearAllDecor,
      undo,
      redo,
      saveLayout,
      reloadLayout: loadLayout,
      discardChanges,
      requestExit,
      confirmExit,
      cancelExit,
      showSaveModal,
      setShowSaveModal,
      showDeleteModal,
      setShowDeleteModal,
      showClearModal,
      setShowClearModal,
      showExitModal,
      setShowExitModal,
      showHelpModal,
      setShowHelpModal,
    }),
    [
      editorState,
      editorMode,
      layoutLoading,
      layoutSaving,
      layoutError,
      visualMode,
      snapToGrid,
      beginnerMode,
      decorItems,
      selectedDecorId,
      selectedDecor,
      tool,
      hasChanges,
      canUndo,
      canRedo,
      elapsedSeconds,
      version,
      updatedAt,
      setEditorMode,
      setKind,
      updateTool,
      placeDecorAt,
      selectDecor,
      updateSelectedDecor,
      duplicateSelectedDecor,
      removeSelectedDecor,
      clearAllDecor,
      undo,
      redo,
      saveLayout,
      loadLayout,
      discardChanges,
      requestExit,
      confirmExit,
      cancelExit,
      showSaveModal,
      showDeleteModal,
      showClearModal,
      showExitModal,
      showHelpModal,
    ]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
