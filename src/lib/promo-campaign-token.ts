import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET?.trim() || process.env.CRM_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("Secret de signature promo indisponible (ADMIN_SECRET).");
  }
  return secret;
}

export function signPromoEnrollmentToken(enrollmentId: string, expiresAtMs: number): string {
  const payload = `${enrollmentId}.${expiresAtMs}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

export function verifyPromoEnrollmentToken(
  token: string,
): { enrollmentId: string; expiresAtMs: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [enrollmentId, expStr, sig] = parts;
    if (!enrollmentId || !expStr || !sig) return null;
    const expiresAtMs = Number(expStr);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return null;
    const payload = `${enrollmentId}.${expiresAtMs}`;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { enrollmentId, expiresAtMs };
  } catch {
    return null;
  }
}
