import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import {
  ensureCrmRolesCache,
  getCachedRoleLabel,
} from "@/lib/crm-roles-db";
import { changeOwnPassword, changeOwnPasswordSchema, getCrmUserById } from "@/lib/crm-users";
import {
  getCrmUserProfile,
  updateCrmUserProfile,
  updateOwnProfileSchema,
} from "@/lib/crm-user-profile";
import {
  ADMIN_SESSION_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";
import { getSessionMaxAgeSeconds } from "@/lib/crm-security-settings";
import { z } from "zod";

const patchAccountSchema = z
  .object({
    name: updateOwnProfileSchema.shape.name,
    avatarUrl: updateOwnProfileSchema.shape.avatarUrl,
    dashboardLayout: updateOwnProfileSchema.shape.dashboardLayout,
    currentPassword: changeOwnPasswordSchema.shape.currentPassword,
    newPassword: changeOwnPasswordSchema.shape.newPassword.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.avatarUrl !== undefined ||
      data.dashboardLayout !== undefined ||
      data.newPassword !== undefined,
    { message: "Aucune modification demandée." },
  );

async function buildAccountResponse(userId: string) {
  await ensureCrmRolesCache();
  const user = await getCrmUserById(userId);
  if (!user) return null;
  const profile = await getCrmUserProfile(userId);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: getCachedRoleLabel(user.role),
    mustChangePassword: user.mustChangePassword,
    avatarUrl: profile.avatarUrl,
    dashboardLayout: profile.dashboardLayout,
  };
}

export async function GET() {
  const authError = await requireAdminAuth({ allowPasswordChange: true });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const account = await buildAccountResponse(session.userId);
  if (!account) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  return NextResponse.json({ account });
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
    const parsed = patchAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const { name, avatarUrl, dashboardLayout, currentPassword, newPassword } = parsed.data;

    if (name !== undefined || avatarUrl !== undefined || dashboardLayout !== undefined) {
      await updateCrmUserProfile(session.userId, { name, avatarUrl, dashboardLayout });
    }

    if (newPassword) {
      const passwordResult = await changeOwnPassword(session.userId, {
        currentPassword,
        newPassword,
      });
      if (!passwordResult.ok || !passwordResult.user) {
        return NextResponse.json(
          { error: passwordResult.error ?? "Mise à jour impossible." },
          { status: 400 },
        );
      }
    }

    const account = await buildAccountResponse(session.userId);
    if (!account) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    const maxAge = await getSessionMaxAgeSeconds();
    const cookie = await buildCrmSessionCookie(
      {
        userId: account.userId,
        email: account.email,
        name: account.name,
        role: account.role,
        mustChangePassword: account.mustChangePassword,
      },
      secret,
      maxAge,
    );

    const response = NextResponse.json({ success: true, account });
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
