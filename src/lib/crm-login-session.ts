import { NextResponse } from "next/server";
import type { CrmRole } from "@/content/crm-roles";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_COOKIE,
  buildCrmSessionCookie,
} from "@/lib/crm-session";
import { getSessionMaxAgeSeconds } from "@/lib/crm-security-settings";
import { logAdminLogin } from "@/lib/crm-login-logs";
import { clearRateLimit, getClientIp } from "@/lib/rate-limit";

export async function completeCrmLoginSession(input: {
  userId: string;
  email: string;
  name: string;
  role: CrmRole;
  mustChangePassword: boolean;
  request: Request;
  /** Clé rate-limit 2FA à effacer (optionnel). */
  twoFaRateKey?: string;
}): Promise<NextResponse> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin non configuré." }, { status: 503 });
  }

  const maxAge = await getSessionMaxAgeSeconds();
  const session = await buildCrmSessionCookie(
    {
      userId: input.userId,
      email: input.email,
      name: input.name,
      role: input.role,
      mustChangePassword: input.mustChangePassword,
    },
    secret,
    maxAge,
  );

  void logAdminLogin({
    userId: input.userId,
    email: input.email,
    name: input.name,
    ipAddress: getClientIp(input.request),
    userAgent: input.request.headers.get("user-agent"),
    success: true,
  });

  if (input.twoFaRateKey) {
    clearRateLimit("admin-login-2fa", input.twoFaRateKey);
  }

  const response = NextResponse.json({
    success: true,
    mustChangePassword: input.mustChangePassword,
    user: { name: input.name, email: input.email, role: input.role },
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
