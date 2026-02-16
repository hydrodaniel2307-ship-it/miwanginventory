import { getSession } from "@/lib/auth";

const INTERNAL_ORG_ID = process.env.INTERNAL_ORG_ID?.trim() || "miwang-main";

export type SessionContext = {
  id: string;
  role: string;
};

export type OrgContext = {
  orgId: string;
  session: SessionContext;
};

export type OrgContextResult =
  | { ok: true; context: OrgContext }
  | { ok: false; status: 401 | 403; error: string };

export const ADMIN_ROLES = new Set(["CEO", "Manager"]);

export function isAdminRole(role: string | undefined): boolean {
  return role ? ADMIN_ROLES.has(role) : false;
}

export async function getOrgContext(): Promise<OrgContext | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    orgId: INTERNAL_ORG_ID,
    session,
  };
}

export async function requireOrgContext(): Promise<OrgContextResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  return {
    ok: true,
    context: {
      orgId: INTERNAL_ORG_ID,
      session,
    },
  };
}

export async function requireAdminOrgContext(): Promise<OrgContextResult> {
  const result = await requireOrgContext();
  if (!result.ok) return result;

  if (!isAdminRole(result.context.session.role)) {
    return { ok: false, status: 403, error: "관리자 권한이 필요합니다." };
  }

  return result;
}
