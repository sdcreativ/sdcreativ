import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, LEGACY_ADMIN_COOKIE } from "@/lib/crm-session";
import { verifyCrmE2eLoginToken } from "@/lib/crm-e2e";
import { completeCrmLoginSession } from "@/lib/crm-login-session";
import { authenticateCrmUser, ensureBootstrapAdmin } from "@/lib/crm-users";
import { logAdminLogin } from "@/lib/crm-login-logs";
import { getTotpAuthState } from "@/lib/crm-totp";
import { signTotpChallenge } from "@/lib/crm-totp-challenge";
import { issueLoginEmailOtp } from "@/lib/crm-email-otp";
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
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      e2eLoginToken?: string;
    };
    const { email, password, e2eLoginToken } = body;

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

    // Bypass 2FA réservé aux tests e2e (CRM_E2E_LOGIN_TOKEN ≥ 32 car.).
    if (verifyCrmE2eLoginToken(e2eLoginToken)) {
      clearRateLimit("admin-login", rateKey);
      return completeCrmLoginSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        request,
      });
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
        method: "totp",
      });
      return NextResponse.json({
        requires2fa: true,
        method: "totp",
        challengeToken,
        user: { name: user.name, email: user.email },
        mustChangePassword: user.mustChangePassword,
      });
    }

    clearRateLimit("admin-login", rateKey);
    const ipAddress = getClientIp(request);
    const otpResult = await issueLoginEmailOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      personalEmail: user.personalEmail,
      ipAddress,
    });
    if (!otpResult.ok) {
      return NextResponse.json({ error: otpResult.error }, { status: 503 });
    }

    const challengeToken = signTotpChallenge({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      method: otpResult.channel === "sms" ? "sms" : "email",
    });
    return NextResponse.json({
      requires2fa: true,
      method: otpResult.channel === "sms" ? "sms" : "email",
      challengeToken,
      otpSentTo: otpResult.sentTo,
      otpChannel: otpResult.channel,
      smsAvailable: otpResult.smsAvailable,
      maskedPhone: otpResult.maskedPhone,
      user: { name: user.name, email: user.email },
      mustChangePassword: user.mustChangePassword,
    });
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
