"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "miwang-session";

// --- Credentials from environment ---

type Account = { password: string; role: string };

function getAccounts(): Record<string, Account> {
  const raw = process.env.AUTH_CREDENTIALS;
  if (!raw) {
    throw new Error("AUTH_CREDENTIALS env var is not set");
  }
  const accounts: Record<string, Account> = {};
  for (const entry of raw.split(",")) {
    const [id, password, role] = entry.trim().split(":");
    if (id && password && role) {
      accounts[id] = { password, role };
    }
  }
  return accounts;
}

// --- HMAC session signing ---

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is not set");
  }
  return secret;
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

  // Timing-safe comparison to prevent timing attacks
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

// --- Timing-safe password comparison ---

function safePasswordCompare(input: string, stored: string): boolean {
  const inputBuf = Buffer.from(input, "utf8");
  const storedBuf = Buffer.from(stored, "utf8");
  if (inputBuf.length !== storedBuf.length) {
    // Compare against stored anyway to keep constant time
    timingSafeEqual(storedBuf, storedBuf);
    return false;
  }
  return timingSafeEqual(inputBuf, storedBuf);
}

// --- Public API ---

export async function login(
  userId: string,
  password: string,
  rememberMe = true
) {
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

  const data = verifySignedCookie(cookie.value);
  if (!data) return null;

  return data as { role: string; id: string };
}
