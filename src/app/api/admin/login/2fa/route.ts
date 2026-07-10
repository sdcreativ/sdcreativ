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
import { normalizeLoginEmailOtp, verifyLoginEmailOtp } from "@/lib/crm-email-otp";
import { getCrmUserById } from "@/lib/crm-users";
import type { CrmRole } from "@/content/crm-roles";
import {
  ADMIN_2FA_RATE_LIMIT,
  clearRateLimit,
  getClientIp,
  getRateLimitStatus,
  rateLimitExceededResponse,
  recordRateLimitFailure,
} from "@/lib/rate-limit";

function twoFaRateLimitKey(request: Request, userId: string): string {
  return `${getClientIp(request)}:${userId}`;
}

async function completeLoginSession(payload: {
  userId: string;
  email: string;
  name: string;
  role: CrmRole;
  mustChangePassword: boolean;
  request: Request;
  rateKey: string;
}) {
  const secret = process.env.ADMIN_SECRET!;
  const maxAge = await getSessionMaxAgeSeconds();
  const session = await buildCrmSessionCookie(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    },
    secret,
    maxAge,
  );

  void logAdminLogin({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    ipAddress: getClientIp(payload.request),
    userAgent: payload.request.headers.get("user-agent"),
    success: true,
  });

  clearRateLimit("admin-login-2fa", payload.rateKey);

  const response = NextResponse.json({
    success: true,
    mustChangePassword: payload.mustChangePassword,
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
      return NextResponse.json({ error: "Jeton et code de vérification requis." }, { status: 400 });
    }

    const payload = verifyTotpChallenge(challengeToken);
    if (!payload) {
      return NextResponse.json({ error: "Session 2FA expirée. Reconnectez-vous." }, { status: 401 });
    }

    const rateKey = twoFaRateLimitKey(request, payload.userId);
    const rateStatus = getRateLimitStatus("admin-login-2fa", rateKey, ADMIN_2FA_RATE_LIMIT);
    if (rateStatus.limited) {
      return rateLimitExceededResponse(rateStatus.retryAfterSec);
    }

    const method = payload.method ?? "totp";
    let verified = false;

    if (method === "totp") {
      const totp = await getTotpAuthState(payload.userId);
      verified = Boolean(totp?.enabled && totp.secret && verifyTotpCode(totp.secret, code));
    } else if (method === "email") {
      verified = normalizeLoginEmailOtp(code) !== null && (await verifyLoginEmailOtp(payload.userId, code));
    }

    if (!verified) {
      recordRateLimitFailure("admin-login-2fa", rateKey, ADMIN_2FA_RATE_LIMIT);
      void logAdminLogin({
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
        success: false,
      });
      return NextResponse.json(
        { error: method === "email" ? "Code email invalide ou expiré." : "Code 2FA invalide." },
        { status: 401 },
      );
    }

    const user = await getCrmUserById(payload.userId);
    const mustChangePassword = user?.mustChangePassword ?? payload.mustChangePassword ?? false;

    return completeLoginSession({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      mustChangePassword,
      request,
      rateKey,
    });
  } catch (error) {
    console.error("[api/admin/login/2fa] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
