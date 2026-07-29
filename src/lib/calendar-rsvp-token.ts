import { createHmac, timingSafeEqual } from "node:crypto";

const RSVP_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 jours

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET?.trim() || process.env.CRM_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("Secret de signature RSVP indisponible (ADMIN_SECRET).");
  }
  return secret;
}

export type CalendarRsvpTokenPayload = {
  eventId: string;
  email: string;
  expiresAtMs: number;
};

export function signCalendarRsvpToken(
  eventId: string,
  email: string,
  expiresAtMs = Date.now() + RSVP_TTL_MS,
): string {
  const payloadObj: CalendarRsvpTokenPayload = {
    eventId,
    email: email.trim().toLowerCase(),
    expiresAtMs,
  };
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCalendarRsvpToken(token: string): CalendarRsvpTokenPayload | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<CalendarRsvpTokenPayload>;
    if (
      typeof parsed.eventId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.expiresAtMs !== "number"
    ) {
      return null;
    }
    if (!Number.isFinite(parsed.expiresAtMs) || parsed.expiresAtMs < Date.now()) return null;
    return {
      eventId: parsed.eventId,
      email: parsed.email.trim().toLowerCase(),
      expiresAtMs: parsed.expiresAtMs,
    };
  } catch {
    return null;
  }
}

export function buildCalendarRsvpUrl(eventId: string, email: string, siteUrl?: string): string {
  const base = (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(
    /\/$/,
    "",
  );
  const token = signCalendarRsvpToken(eventId, email);
  return `${base}/rsvp/${encodeURIComponent(token)}`;
}
