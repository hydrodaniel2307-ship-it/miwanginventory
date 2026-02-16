import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "miwang-session";

// --- HMAC verification using Web Crypto (Edge-compatible) ---

async function verifySessionSignature(cookieValue: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const payload = cookieValue.substring(0, dotIndex);
  const signature = cookieValue.substring(dotIndex + 1);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Length + value comparison (HMAC makes timing attacks impractical here)
  return expected.length === signature.length && expected === signature;
}

// --- CSRF Origin check ---

function checkCsrf(request: NextRequest): NextResponse | null {
  const method = request.method;
  // Only check mutating methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return NextResponse.json(
      { error: "CSRF 검증 실패: Origin 헤더 없음" },
      { status: 403 }
    );
  }

  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json(
        { error: "CSRF 검증 실패: Origin 불일치" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "CSRF 검증 실패: 잘못된 Origin" },
      { status: 403 }
    );
  }

  return null; // passed
}

// --- Main middleware ---

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api");
  const isLoginPage = pathname === "/login";

  // CSRF check for API mutating requests
  if (isApiRoute) {
    const csrfResult = checkCsrf(request);
    if (csrfResult) return csrfResult;
    return NextResponse.next();
  }

  // Session validation for protected pages
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  let hasValidSession = false;

  if (sessionCookie?.value) {
    hasValidSession = await verifySessionSignature(sessionCookie.value);
  }

  // Unauthenticated → redirect to login
  if (!hasValidSession && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "session");
    return NextResponse.redirect(url);
  }

  // Authenticated on login page → redirect to dashboard
  if (hasValidSession && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
