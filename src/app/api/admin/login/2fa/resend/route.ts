import { NextResponse } from "next/server";
import { verifyTotpChallenge } from "@/lib/crm-totp-challenge";
import { resendLoginEmailOtp } from "@/lib/crm-email-otp";
import {
  ADMIN_OTP_RESEND_RATE_LIMIT,
  getClientIp,
  getRateLimitStatus,
  rateLimitExceededResponse,
  recordRateLimitFailure,
} from "@/lib/rate-limit";

function resendRateLimitKey(request: Request, userId: string): string {
  return `${getClientIp(request)}:${userId}`;
}

export async function POST(request: Request) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Admin non configuré." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      challengeToken?: string;
      channel?: "email" | "sms";
    };
    const { challengeToken, channel } = body;

    if (!challengeToken) {
      return NextResponse.json({ error: "Jeton requis." }, { status: 400 });
    }

    const payload = verifyTotpChallenge(challengeToken);
    if (!payload) {
      return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
    }

    const method = payload.method ?? "totp";
    if (method !== "email" && method !== "sms") {
      return NextResponse.json(
        { error: "Le renvoi de code n'est pas disponible pour cette vérification." },
        { status: 400 },
      );
    }

    const rateKey = resendRateLimitKey(request, payload.userId);
    const rateStatus = getRateLimitStatus("admin-login-otp-resend", rateKey, ADMIN_OTP_RESEND_RATE_LIMIT);
    if (rateStatus.limited) {
      return rateLimitExceededResponse(rateStatus.retryAfterSec);
    }

    const preferredChannel =
      channel === "sms" ? "sms" : channel === "email" ? "email" : method === "sms" ? "sms" : "email";

    const result = await resendLoginEmailOtp({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      ipAddress: getClientIp(request),
      preferredChannel,
    });

    if (!result.ok) {
      if (result.retryAfterSec) {
        return NextResponse.json(
          { error: result.error },
          { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
        );
      }
      recordRateLimitFailure("admin-login-otp-resend", rateKey, ADMIN_OTP_RESEND_RATE_LIMIT);
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      otpSentTo: result.sentTo,
      otpChannel: result.channel,
      smsAvailable: result.smsAvailable,
      maskedPhone: result.maskedPhone,
      method: result.channel === "sms" ? "sms" : "email",
    });
  } catch (error) {
    console.error("[api/admin/login/2fa/resend] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
