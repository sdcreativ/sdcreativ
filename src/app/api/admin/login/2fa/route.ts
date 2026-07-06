import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";
import { getSessionMaxAgeSeconds } from "@/lib/crm-security-settings";
import { logAdminLogin } from "@/lib/crm-login-logs";
import { verifyTotpChallenge } from "@/lib/crm-totp-challenge";
import { getTotpAuthState, verifyTotpCode } from "@/lib/crm-totp";

function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin non configuré." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { challengeToken?: string; code?: string };
    const { challengeToken, code } = body;

    if (!challengeToken || !code) {
      return NextResponse.json({ error: "Jeton et code TOTP requis." }, { status: 400 });
    }

    const payload = verifyTotpChallenge(challengeToken);
    if (!payload) {
      return NextResponse.json({ error: "Session 2FA expirée. Reconnectez-vous." }, { status: 401 });
    }

    const totp = await getTotpAuthState(payload.userId);
    if (!totp?.enabled || !totp.secret || !verifyTotpCode(totp.secret, code)) {
      void logAdminLogin({
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        ipAddress: clientIp(request),
        userAgent: request.headers.get("user-agent"),
        success: false,
      });
      return NextResponse.json({ error: "Code 2FA invalide." }, { status: 401 });
    }

    const maxAge = await getSessionMaxAgeSeconds();
    const session = await buildCrmSessionCookie(
      {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
      secret,
      maxAge,
    );

    void logAdminLogin({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
      success: true,
    });

    const response = NextResponse.json({
      success: true,
      user: { name: payload.name, email: payload.email, role: payload.role },
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: session.maxAge,
    });
    response.cookies.delete(LEGACY_ADMIN_COOKIE);
    return response;
  } catch (error) {
    console.error("[api/admin/login/2fa] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
