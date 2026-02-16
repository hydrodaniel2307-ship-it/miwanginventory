"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/editor-context";

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

export function useEditorShortcuts() {
  const {
    editorMode,
    selectedDecorId,
    duplicateSelectedDecor,
    setShowDeleteModal,
    undo,
    redo,
    selectDecor,
    setShowSaveModal,
    setShowHelpModal,
    canUndo,
    canRedo,
  } = useEditor();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!editorMode) return;
      if (isInputFocused()) return;

      const key = e.key.toLowerCase();

      // Ctrl+S: save
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        setShowSaveModal(true);
        return;
      }

      // ?: help
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShowHelpModal(true);
        return;
      }

      // C: duplicate
      if (key === "c" && !e.ctrlKey && !e.metaKey) {
        if (selectedDecorId) {
          e.preventDefault();
          duplicateSelectedDecor();
        }
        return;
      }

      // Delete/Backspace: delete selected
      if (key === "delete" || key === "backspace") {
        if (selectedDecorId) {
          e.preventDefault();
          setShowDeleteModal(true);
        }
        return;
      }

      // Z: undo (without Shift)
      if (key === "z" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Shift+Z: redo
      if (key === "z" && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Escape: deselect
      if (key === "escape") {
        e.preventDefault();
        selectDecor(null);
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    editorMode,
    selectedDecorId,
    duplicateSelectedDecor,
    setShowDeleteModal,
    undo,
    redo,
    selectDecor,
    setShowSaveModal,
    setShowHelpModal,
    canUndo,
    canRedo,
  ]);
}
