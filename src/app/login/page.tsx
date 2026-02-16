"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginCard } from "@/components/auth/login-card";
import { ValuePanel } from "@/components/auth/value-panel";

function LoginContent() {
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session";

  return (
    <AuthLayout panel={<ValuePanel />}>
      <LoginCard sessionExpired={sessionExpired} />
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
