import { createHmac, timingSafeEqual } from "crypto";
import type { CrmRole } from "@/content/crm-roles";

export type TotpChallengePayload = {
  userId: string;
  email: string;
  name: string;
  role: CrmRole;
  exp: number;
};

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signTotpChallenge(payload: Omit<TotpChallengePayload, "exp">): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET manquant.");

  const full: TotpChallengePayload = { ...payload, exp: Date.now() + 5 * 60_000 };
  const data = base64UrlEncode(JSON.stringify(full));
  const sig = base64UrlEncode(createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyTotpChallenge(token: string): TotpChallengePayload | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = base64UrlEncode(createHmac("sha256", secret).update(data).digest());
  if (
    expected.length !== sig.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(data)) as TotpChallengePayload;
    if (!payload.userId || !payload.email || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
