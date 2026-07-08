import { cookies } from "next/headers";
import type { CrmRole } from "@/content/crm-roles";
import type { CrmPermission } from "@/lib/crm-permissions";
import { ensureCrmRolesCache } from "@/lib/crm-roles-db";
import { roleHasPermission } from "@/lib/crm-permissions";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_COOKIE,
  verifyCrmSession,
  type CrmSessionPayload,
} from "@/lib/crm-session";
import { roleCanWrite } from "@/lib/crm-users";

function getAuthSecret(): string | undefined {
  return process.env.ADMIN_SECRET;
}

export async function getAdminSession(): Promise<CrmSessionPayload | null> {
  const secret = getAuthSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  return await verifyCrmSession(sessionToken, secret);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function requireAdminAuth(options?: {
  roles?: CrmRole[];
  write?: boolean;
  permission?: CrmPermission;
  /** Au moins une de ces permissions suffit. */
  anyPermission?: CrmPermission[];
  /** Autorise l'accès alors que mustChangePassword est actif (changement de mot de passe). */
  allowPasswordChange?: boolean;
}): Promise<Response | null> {
  await ensureCrmRolesCache();

  const secret = getAuthSecret();
  if (!secret) {
    return Response.json({ error: "Admin non configuré." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (session.mustChangePassword && !options?.allowPasswordChange) {
    return Response.json(
      { error: "Définissez votre mot de passe personnel.", mustChangePassword: true },
      { status: 403 },
    );
  }

  if (options?.roles && !options.roles.includes(session.role)) {
    return Response.json({ error: "Permissions insuffisantes." }, { status: 403 });
  }

  if (options?.permission && !roleHasPermission(session.role, options.permission)) {
    return Response.json({ error: "Permissions insuffisantes." }, { status: 403 });
  }

  if (
    options?.anyPermission &&
    !options.anyPermission.some((perm) => roleHasPermission(session.role, perm))
  ) {
    return Response.json({ error: "Permissions insuffisantes." }, { status: 403 });
  }

  if (options?.write && !roleCanWrite(session.role)) {
    return Response.json({ error: "Accès lecture seule." }, { status: 403 });
  }

  return null;
}

export async function requireAdminRole(roles: CrmRole[]): Promise<Response | null> {
  return requireAdminAuth({ roles });
}
