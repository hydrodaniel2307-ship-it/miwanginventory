"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/editor-context";
import { Save, Trash2, LogOut, Keyboard } from "lucide-react";

export function SaveConfirmModal() {
  const { showSaveModal, setShowSaveModal, saveLayout, decorItems, hasChanges } =
    useEditor();

  async function handleSave() {
    setShowSaveModal(false);
    await saveLayout();
  }

  return (
    <AlertDialog open={showSaveModal} onOpenChange={setShowSaveModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Save className="size-5" />
            레이아웃 저장
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>현재 배치를 저장하시겠습니까?</p>
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p>배치된 오브젝트: {decorItems.length}개</p>
                {hasChanges && <p className="text-amber-500">변경 사항이 있습니다.</p>}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px] sm:min-h-0">취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            className="min-h-[44px] sm:min-h-0"
          >
            저장
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteConfirmModal() {
  const { showDeleteModal, setShowDeleteModal, removeSelectedDecor, selectedDecor } =
    useEditor();

  function handleDelete() {
    setShowDeleteModal(false);
    removeSelectedDecor();
  }

  return (
    <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            오브젝트 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                &ldquo;
                {selectedDecor
                  ? `${
                      selectedDecor.kind === "box"
                        ? "상자"
                        : selectedDecor.kind === "pallet"
                          ? "팔레트"
                          : "선반"
                    }-${selectedDecor.id.slice(0, 6)}`
                  : "선택 없음"}
                &rdquo;을(를) 삭제하시겠습니까?
              </p>
              <p className="text-xs text-muted-foreground">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px] sm:min-h-0">취소</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            className="min-h-[44px] sm:min-h-0"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ClearAllModal() {
  const { showClearModal, setShowClearModal, clearAllDecor, decorItems } = useEditor();

  function handleClear() {
    setShowClearModal(false);
    clearAllDecor();
  }

  return (
    <AlertDialog open={showClearModal} onOpenChange={setShowClearModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            전체 초기화
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>배치된 {decorItems.length}개의 오브젝트를 모두 삭제하시겠습니까?</p>
              <p className="text-xs font-medium text-destructive">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px] sm:min-h-0">취소</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleClear}
            className="min-h-[44px] sm:min-h-0"
          >
            전체 삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ExitWarningModal() {
  const {
    showExitModal,
    setShowExitModal,
    confirmExit,
    saveLayout,
    discardChanges,
    decorItems,
    hasChanges,
  } = useEditor();

  async function handleSaveAndExit() {
    const saved = await saveLayout();
    if (!saved) return;
    setShowExitModal(false);
    confirmExit();
  }

  function handleExitWithoutSaving() {
    discardChanges();
    setShowExitModal(false);
    confirmExit();
  }

  return (
    <AlertDialog open={showExitModal} onOpenChange={setShowExitModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="size-5" />
            저장하지 않고 나가시겠습니까?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>현재 변경 사항이 저장되지 않았습니다.</p>
              {hasChanges && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <p>배치된 오브젝트: {decorItems.length}개</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="min-h-[44px] sm:min-h-0">
            계속 편집
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleSaveAndExit}
            className="min-h-[44px] sm:min-h-0"
          >
            저장하고 나가기
          </Button>
          <Button
            variant="destructive"
            onClick={handleExitWithoutSaving}
            className="min-h-[44px] sm:min-h-0"
          >
            저장 안 하고 나가기
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const SHORTCUTS = [
  { key: "C", desc: "선택된 오브젝트 복제" },
  { key: "Delete", desc: "선택된 오브젝트 삭제" },
  { key: "Z", desc: "실행 취소" },
  { key: "Shift+Z", desc: "다시 실행" },
  { key: "A", desc: "전체 선택 해제" },
  { key: "Escape", desc: "선택 해제" },
  { key: "Ctrl+S", desc: "저장" },
  { key: "?", desc: "이 도움말 열기" },
] as const;

export function KeyboardHelpModal() {
  const { showHelpModal, setShowHelpModal } = useEditor();

  return (
    <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            키보드 단축키
          </DialogTitle>
          <DialogDescription>편집 모드에서 사용 가능한 단축키</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between rounded px-2 py-2 text-sm active:bg-muted/50 sm:py-1.5 sm:hover:bg-muted/50"
            >
              <span className="text-muted-foreground">{shortcut.desc}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowHelpModal(false)}
            className="min-h-[44px] sm:min-h-0"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditorModals() {
  return (
    <>
      <SaveConfirmModal />
      <DeleteConfirmModal />
      <ClearAllModal />
      <ExitWarningModal />
      <KeyboardHelpModal />
    </>
  );
}
