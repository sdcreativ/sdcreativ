import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";
import { authenticateCrmUser, ensureBootstrapAdmin } from "@/lib/crm-users";
import { getSessionMaxAgeSeconds } from "@/lib/crm-security-settings";
import { logAdminLogin } from "@/lib/crm-login-logs";
import { getTotpAuthState } from "@/lib/crm-totp";
import { signTotpChallenge } from "@/lib/crm-totp-challenge";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  clearRateLimit,
  getClientIp,
  getRateLimitStatus,
  rateLimitExceededResponse,
  recordRateLimitFailure,
} from "@/lib/rate-limit";

function loginRateLimitKey(request: Request, email: string): string {
  return `${getClientIp(request)}:${email.trim().toLowerCase()}`;
}

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Admin non configuré (ADMIN_SECRET manquant)" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
    }

    const rateKey = loginRateLimitKey(request, email);
    const rateStatus = getRateLimitStatus("admin-login", rateKey, ADMIN_LOGIN_RATE_LIMIT);
    if (rateStatus.limited) {
      return rateLimitExceededResponse(rateStatus.retryAfterSec);
    }

    await ensureBootstrapAdmin();

    const user = await authenticateCrmUser(email, password);
    if (user === "pending") {
      recordRateLimitFailure("admin-login", rateKey, ADMIN_LOGIN_RATE_LIMIT);
      void logAdminLogin({
        email: email.trim(),
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
        success: false,
      });
      return NextResponse.json(
        {
          error:
            "Compte en attente d'activation. Consultez votre email pour définir votre mot de passe.",
        },
        { status: 403 },
      );
    }
    if (!user) {
      recordRateLimitFailure("admin-login", rateKey, ADMIN_LOGIN_RATE_LIMIT);
      void logAdminLogin({
        email: email.trim(),
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
        success: false,
      });
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    const totp = await getTotpAuthState(user.id);
    if (totp?.enabled) {
      clearRateLimit("admin-login", rateKey);
      const challengeToken = signTotpChallenge({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      });
      return NextResponse.json({
        requires2fa: true,
        challengeToken,
        user: { name: user.name, email: user.email },
        mustChangePassword: user.mustChangePassword,
      });
    }

    const maxAge = await getSessionMaxAgeSeconds();
    const session = await buildCrmSessionCookie(
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

    void logAdminLogin({
      userId: user.id,
      email: user.email,
      name: user.name,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      success: true,
    });

    clearRateLimit("admin-login", rateKey);

    const response = NextResponse.json({
      success: true,
      mustChangePassword: user.mustChangePassword,
      user: { name: user.name, email: user.email, role: user.role },
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
    console.error("[api/admin/login] POST", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(LEGACY_ADMIN_COOKIE);
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
