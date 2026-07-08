import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import {
  ensureCrmRolesCache,
  getCachedRoleLabel,
} from "@/lib/crm-roles-db";
import { getRolePermissions } from "@/lib/crm-permissions";
import { changeOwnPassword, changeOwnPasswordSchema, getCrmUserById } from "@/lib/crm-users";
import {
  ADMIN_SESSION_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";
import { getSessionMaxAgeSeconds } from "@/lib/crm-security-settings";

export async function GET() {
  const authError = await requireAdminAuth({ allowPasswordChange: true });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  await ensureCrmRolesCache();
  const user = await getCrmUserById(session.userId);

  return NextResponse.json({
    account: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      roleLabel: getCachedRoleLabel(session.role),
      mustChangePassword: user?.mustChangePassword ?? session.mustChangePassword ?? false,
    },
  });
}

export async function PATCH(request: Request) {
  const authError = await requireAdminAuth({ allowPasswordChange: true });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin non configuré." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = changeOwnPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const result = await changeOwnPassword(session.userId, parsed.data);
    if (!result.ok || !result.user) {
      return NextResponse.json({ error: result.error ?? "Mise à jour impossible." }, { status: 400 });
    }

    const maxAge = await getSessionMaxAgeSeconds();
    const cookie = await buildCrmSessionCookie(
      {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        mustChangePassword: false,
      },
      secret,
      maxAge,
    );

    const response = NextResponse.json({
      success: true,
      account: {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        mustChangePassword: false,
      },
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, cookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: cookie.maxAge,
    });
    return response;
  } catch (error) {
    console.error("[api/admin/account] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
