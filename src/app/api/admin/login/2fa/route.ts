import { NextResponse } from "next/server";
import { completeCrmLoginSession } from "@/lib/crm-login-session";
import { verifyTotpChallenge } from "@/lib/crm-totp-challenge";
import { getTotpAuthState, verifyTotpCode } from "@/lib/crm-totp";
import { normalizeLoginEmailOtp, verifyLoginEmailOtp } from "@/lib/crm-email-otp";
import { getCrmUserById } from "@/lib/crm-users";
import { logAdminLogin } from "@/lib/crm-login-logs";
import {
  ADMIN_2FA_RATE_LIMIT,
  getClientIp,
  getRateLimitStatus,
  rateLimitExceededResponse,
  recordRateLimitFailure,
} from "@/lib/rate-limit";

function twoFaRateLimitKey(request: Request, userId: string): string {
  return `${getClientIp(request)}:${userId}`;
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
    } else if (method === "email" || method === "sms") {
      verified =
        normalizeLoginEmailOtp(code) !== null && (await verifyLoginEmailOtp(payload.userId, code));
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
        {
          error:
            method === "sms"
              ? "Code SMS invalide ou expiré."
              : method === "email"
                ? "Code email invalide ou expiré."
                : "Code 2FA invalide.",
        },
        { status: 401 },
      );
    }

    const user = await getCrmUserById(payload.userId);
    const mustChangePassword = user?.mustChangePassword ?? payload.mustChangePassword ?? false;

    return completeCrmLoginSession({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      mustChangePassword,
      request,
      twoFaRateKey: rateKey,
    });
  } catch (error) {
    console.error("[api/admin/login/2fa] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
