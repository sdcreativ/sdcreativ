import { NextResponse } from "next/server";
import { requireAdminAuth, getAdminSession } from "@/lib/admin-auth";
import { uploadCrmAvatar } from "@/lib/crm-avatar-media";
import { updateCrmUserProfile } from "@/lib/crm-user-profile";
import {
  ADMIN_SESSION_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";
import { getSessionMaxAgeSeconds } from "@/lib/crm-security-settings";
import { getCrmUserById } from "@/lib/crm-users";
import {
  ensureCrmRolesCache,
  getCachedRoleLabel,
} from "@/lib/crm-roles-db";

export async function POST(request: Request) {
  const authError = await requireAdminAuth({ allowPasswordChange: true });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte CRM requis." }, { status: 400 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin non configuré." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadCrmAvatar(
      session.userId,
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );

    const profile = await updateCrmUserProfile(session.userId, { avatarUrl: url });
    const user = await getCrmUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    await ensureCrmRolesCache();
    const maxAge = await getSessionMaxAgeSeconds();
    const cookie = await buildCrmSessionCookie(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      secret,
      maxAge,
    );

    const response = NextResponse.json({
      url,
      profile,
      account: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: getCachedRoleLabel(user.role),
        avatarUrl: profile.avatarUrl,
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
    const message = error instanceof Error ? error.message : "Upload impossible.";
    console.error("[api/admin/account/avatar] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
