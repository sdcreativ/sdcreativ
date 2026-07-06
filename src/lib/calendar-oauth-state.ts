import { createHmac } from "crypto";
import type { CalendarOAuthProvider } from "@/lib/calendar-oauth-config";

type OAuthStatePayload = {
  userId: string;
  provider: CalendarOAuthProvider;
  exp: number;
};

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function signOAuthState(userId: string, provider: CalendarOAuthProvider): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET manquant.");

  const payload: OAuthStatePayload = {
    userId,
    provider,
    exp: Date.now() + 10 * 60_000,
  };
  const data = base64UrlEncode(JSON.stringify(payload));
  const sig = base64UrlEncode(createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;

  const dot = state.indexOf(".");
  if (dot <= 0) return null;

  const data = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = base64UrlEncode(createHmac("sha256", secret).update(data).digest());
  if (!timingSafeEqual(expected, sig)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(data)) as OAuthStatePayload;
    if (!payload.userId || !payload.provider || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
