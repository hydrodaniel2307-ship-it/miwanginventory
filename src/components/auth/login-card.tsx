"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  Eye,
  EyeOff,
  UserRound,
  Lock,
  Play,
  Check,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";

interface LoginCardProps {
  sessionExpired?: boolean;
}

export function LoginCard({ sessionExpired }: LoginCardProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ userId?: string; password?: string }>(
    {}
  );
  const [shakeForm, setShakeForm] = useState(false);
  const [pulseFields, setPulseFields] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);

  // Session expired toast
  useEffect(() => {
    if (sessionExpired) {
      toast.warning("세션이 만료되었습니다. 다시 로그인해주세요.");
    }
  }, [sessionExpired]);

  function triggerErrorAnimation() {
    setShakeForm(true);
    setPulseFields(true);
    setTimeout(() => setShakeForm(false), 400);
    setTimeout(() => setPulseFields(false), 600);
  }

  function validate() {
    const next: typeof errors = {};
    if (!userId.trim()) next.userId = "아이디를 입력해주세요";
    if (!password) next.password = "비밀번호를 입력해주세요";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      triggerErrorAnimation();
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});
    try {
      const result = await login(userId, password, rememberMe);

      if (result.error) {
        setErrors({ password: result.error });
        triggerErrorAnimation();
        return;
      }

      // Success animation
      setIsSuccess(true);
      toast.success("로그인 성공");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch {
      toast.error("로그인 중 오류가 발생했습니다");
    } finally {
      if (!isSuccess) setIsLoading(false);
    }
  }

  async function handleDemo() {
    setIsLoading(true);
    setErrors({});
    try {
      const result = await login("ceo", "miwang2704", true);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setIsSuccess(true);
      toast.success("데모 계정으로 로그인되었습니다");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch {
      toast.error("로그인 중 오류가 발생했습니다");
    } finally {
      if (!isSuccess) setIsLoading(false);
    }
  }

  function handleSso(provider: string) {
    toast.info(`${provider} 로그인은 준비 중입니다`);
  }

  // Success overlay
  if (isSuccess) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="size-8 text-primary animate-success-check" />
          </div>
          <p className="text-[15px] font-medium animate-in fade-in duration-300 delay-200"
            style={{ animationFillMode: "both" }}
          >
            로그인 성공
          </p>
          <p className="text-[13px] text-muted-foreground animate-in fade-in duration-300 delay-400"
            style={{ animationFillMode: "both" }}
          >
            대시보드로 이동 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6 md:p-10">
      {/* Top bar */}
      <div
        className="flex items-center justify-between animate-in fade-in duration-400"
        style={{ animationFillMode: "both" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/miwang-logo.png"
            alt="미왕 로고"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-[15px] font-semibold tracking-tight">
            미왕
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Centered form */}
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div
            className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-400"
            style={{ animationDelay: "100ms", animationFillMode: "both" }}
          >
            <h1 className="text-[22px] font-bold tracking-tight">
              로그인
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              계정 정보를 입력하여 창고관리 시스템에 접속하세요
            </p>
          </div>

          {/* Form */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`space-y-4 ${shakeForm ? "animate-shake" : ""}`}
            noValidate
          >
            {/* Loading overlay */}
            {isLoading && (
              <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-background/50" />
            )}

            {/* User ID */}
            <div
              className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-400"
              style={{ animationDelay: "150ms", animationFillMode: "both" }}
            >
              <Label htmlFor="userId" className="text-[13px]">
                아이디
              </Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                <Input
                  id="userId"
                  type="text"
                  placeholder="사용자 아이디"
                  autoComplete="username"
                  disabled={isLoading}
                  aria-invalid={!!errors.userId}
                  aria-describedby={errors.userId ? "userId-error" : undefined}
                  className={`h-11 pl-9 ${
                    errors.userId && pulseFields ? "animate-error-pulse border-destructive" : ""
                  } ${errors.userId ? "border-destructive" : ""}`}
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (errors.userId)
                      setErrors((p) => ({ ...p, userId: undefined }));
                  }}
                />
              </div>
              {errors.userId && (
                <p
                  id="userId-error"
                  className="text-[12px] text-destructive pl-0.5"
                >
                  {errors.userId}
                </p>
              )}
            </div>

            {/* Password */}
            <div
              className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-400"
              style={{ animationDelay: "200ms", animationFillMode: "both" }}
            >
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px]">
                  비밀번호
                </Label>
                <button
                  type="button"
                  className="text-[12px] text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setForgotOpen(true)}
                >
                  비밀번호 찾기
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className={`h-11 pl-9 pr-10 ${
                    errors.password && pulseFields ? "animate-error-pulse border-destructive" : ""
                  } ${errors.password ? "border-destructive" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-[12px] text-destructive pl-0.5"
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div
              className="flex items-center gap-2 pt-0.5 animate-in fade-in duration-400"
              style={{ animationDelay: "250ms", animationFillMode: "both" }}
            >
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(v === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="remember"
                className="text-[13px] font-normal text-muted-foreground cursor-pointer select-none"
              >
                로그인 상태 유지
              </Label>
            </div>

            {/* Submit */}
            <div
              className="animate-in fade-in slide-in-from-bottom-2 duration-400"
              style={{ animationDelay: "300ms", animationFillMode: "both" }}
            >
              <Button
                type="submit"
                className="w-full h-11 text-[13px] font-semibold mt-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "로그인"
                )}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div
            className="relative my-6 animate-in fade-in duration-400"
            style={{ animationDelay: "350ms", animationFillMode: "both" }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-background px-3 text-muted-foreground/60">
                또는
              </span>
            </div>
          </div>

          {/* SSO buttons */}
          <div
            className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400"
            style={{ animationDelay: "400ms", animationFillMode: "both" }}
          >
            <Button
              variant="outline"
              className="h-10 text-[13px] gap-2"
              onClick={() => handleSso("Google")}
              disabled={isLoading}
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="h-10 text-[13px] gap-2"
              onClick={() => handleSso("Kakao")}
              disabled={isLoading}
            >
              <svg
                className="size-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3C6.48 3 2 6.84 2 11.5c0 2.95 1.96 5.54 4.87 7.03-.15.56-.55 2.03-.63 2.34-.1.38.14.37.29.27.12-.08 1.87-1.24 2.63-1.75.56.08 1.14.13 1.73.16.04 0 .07 0 .11 0 5.52 0 10-3.84 10-8.55S17.52 3 12 3z" />
              </svg>
              Kakao
            </Button>
          </div>

          {/* Change password link */}
          <div
            className="mt-3 flex justify-center animate-in fade-in duration-400"
            style={{ animationDelay: "450ms", animationFillMode: "both" }}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setChangeOpen(true)}
            >
              <KeyRound className="size-3" />
              비밀번호 변경
            </button>
          </div>

          {/* Demo CTA */}
          <div
            className="mt-6 rounded-lg border border-dashed p-3.5 text-center animate-in fade-in slide-in-from-bottom-2 duration-400"
            style={{ animationDelay: "500ms", animationFillMode: "both" }}
          >
            <p className="text-[12px] text-muted-foreground mb-2">
              계정이 없으신가요?
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-[12px] gap-1.5"
              onClick={handleDemo}
              disabled={isLoading}
            >
              <Play className="size-3" />
              데모 체험하기
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
      <ChangePasswordDialog open={changeOpen} onOpenChange={setChangeOpen} />
    </div>
  );
}
