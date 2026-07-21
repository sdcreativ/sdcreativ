import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import {
  ensureCrmRolesCache,
  getCachedRoleLabel,
} from "@/lib/crm-roles-db";
import { getRolePermissions } from "@/lib/crm-permissions";
import { getCrmUserProfile } from "@/lib/crm-user-profile";
import { isCrmMessagerieUiEnabled } from "@/lib/mail/config";
import {
  getCrmSecuritySettings,
  getSessionMaxAgeSeconds,
} from "@/lib/crm-security-settings";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  await ensureCrmRolesCache();
  const [profile, security] = await Promise.all([
    session.userId !== "legacy"
      ? getCrmUserProfile(session.userId)
      : Promise.resolve({ avatarUrl: null, dashboardLayout: null }),
    getCrmSecuritySettings(),
  ]);

  return NextResponse.json({
    session: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      roleLabel: getCachedRoleLabel(session.role),
      permissions: getRolePermissions(session.role),
      avatarUrl: profile.avatarUrl,
      dashboardLayout: profile.dashboardLayout,
      messagerieEnabled: isCrmMessagerieUiEnabled(),
      idleTimeoutMinutes: security.idleTimeoutMinutes,
    },
  });
}

/** Prolonge le cookie de session (bouton « Rester connecté »). */
export async function POST() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin non configuré." }, { status: 503 });
  }

  const maxAge = await getSessionMaxAgeSeconds();
  const cookie = await buildCrmSessionCookie(
    {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
    },
    secret,
    maxAge,
  );

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: cookie.maxAge,
  });
  response.cookies.delete(LEGACY_ADMIN_COOKIE);
  return response;
}
