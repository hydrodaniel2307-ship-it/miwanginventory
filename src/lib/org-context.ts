import { getSession } from "@/lib/auth";

export const DEFAULT_ORG_ID = "miwang-main";

export type SessionContext = {
  id: string;
  role: string;
};

export type OrgContext = {
  orgId: string;
  session: SessionContext;
};

export const ADMIN_ROLES = new Set(["CEO", "Manager"]);

export function isAdminRole(role: string | undefined): boolean {
  return role ? ADMIN_ROLES.has(role) : false;
}

export async function getOrgContext(): Promise<OrgContext | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    orgId: DEFAULT_ORG_ID,
    session,
  };
}
