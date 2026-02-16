"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "miwang-session";
const BOOTSTRAP_ADMIN_ID = "ceo";
const BOOTSTRAP_ADMIN_PASSWORD = "miwang2704";
const BOOTSTRAP_ADMIN_ROLE = "CEO";
const FALLBACK_SESSION_SECRET = "miwang-bootstrap-session-secret-v1";

type Account = { password: string; role: string };

function mapAuthConfigError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");

  if (msg.includes("AUTH_CREDENTIALS")) {
    return "서버 로그인 설정이 누락되었습니다. 관리자에게 문의해 주세요.";
  }
  if (msg.includes("SESSION_SECRET")) {
    return "서버 세션 설정이 누락되었습니다. 관리자에게 문의해 주세요.";
  }

  return "로그인 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

function getAccounts(): Record<string, Account> {
  const accounts: Record<string, Account> = {
    [BOOTSTRAP_ADMIN_ID]: {
      password: BOOTSTRAP_ADMIN_PASSWORD,
      role: BOOTSTRAP_ADMIN_ROLE,
    },
  };

  const raw = process.env.AUTH_CREDENTIALS;
  if (!raw) return accounts;

  for (const entry of raw.split(",")) {
    const [id, password, role] = entry.trim().split(":");
    if (id && password && role) {
      accounts[id.toLowerCase()] = { password, role };
    }
  }

  // Hard guarantee: bootstrap admin must always be available.
  accounts[BOOTSTRAP_ADMIN_ID] = {
    password: BOOTSTRAP_ADMIN_PASSWORD,
    role: BOOTSTRAP_ADMIN_ROLE,
  };

  return accounts;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  return FALLBACK_SESSION_SECRET;
}

function hmacSign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createSignedCookie(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64");
  const signature = hmacSign(payload);
  return `${payload}.${signature}`;
}

function verifySignedCookie(value: string): object | null {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = value.substring(0, dotIndex);
  const signature = value.substring(dotIndex + 1);
  const expected = hmacSign(payload);

  if (signature.length !== expected.length) return null;

  const isValid = timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8")
  );
  if (!isValid) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function safePasswordCompare(input: string, stored: string): boolean {
  const inputBuf = Buffer.from(input, "utf8");
  const storedBuf = Buffer.from(stored, "utf8");

  if (inputBuf.length !== storedBuf.length) {
    timingSafeEqual(storedBuf, storedBuf);
    return false;
  }

  return timingSafeEqual(inputBuf, storedBuf);
}

export async function login(
  userId: string,
  password: string,
  rememberMe = true
) {
  try {
    const accounts = getAccounts();
    const normalizedId = userId.trim().toLowerCase();
    const account = accounts[normalizedId];

    if (!account || !safePasswordCompare(password, account.password)) {
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다" };
    }

    const sessionData = { role: account.role, id: normalizedId };
    const signedValue = createSignedCookie(sessionData);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, signedValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
    });

    return { success: true, role: account.role };
  } catch (error) {
    return { error: mapAuthConfigError(error) };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const data = verifySignedCookie(cookie.value);
    if (!data) return null;
    return data as { role: string; id: string };
  } catch {
    return null;
  }
}
