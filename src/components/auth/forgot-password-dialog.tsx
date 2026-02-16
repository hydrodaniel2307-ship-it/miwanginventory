"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: ForgotPasswordDialogProps) {
  const [userId, setUserId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error("아이디를 입력해주세요");
      return;
    }
    toast.info("관리자에게 문의하세요");
    setUserId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[18px]">비밀번호 찾기</DialogTitle>
          <DialogDescription className="text-[13px]">
            아이디를 입력하시면 관리자를 통해 비밀번호를 재설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-userId" className="text-[13px]">
              아이디
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
              <Input
                id="forgot-userId"
                type="text"
                placeholder="사용자 아이디"
                className="h-11 pl-9"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground rounded-md bg-muted px-3 py-2.5">
            비밀번호 재설정은 관리자 승인이 필요합니다. 요청 후 관리자에게 직접 문의해 주세요.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="text-[13px]"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" className="text-[13px]">
              요청하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
