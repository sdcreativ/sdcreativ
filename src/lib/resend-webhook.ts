import { createHmac, timingSafeEqual } from "node:crypto";

export function getResendWebhookSecret(): string {
  return (
    process.env.RESEND_WEBHOOK_SECRET?.trim() ||
    process.env.RESEND_WEBHOOK_SVIX_SECRET?.trim() ||
    ""
  );
}

export function isResendWebhookConfigured(): boolean {
  return getResendWebhookSecret().length >= 16;
}

/** Vérifie la signature Svix utilisée par Resend (`whsec_…`). */
export function verifyResendWebhookSignature(
  rawBody: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
  secret = getResendWebhookSecret(),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;

  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");

  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");

  const candidates = headers.signature
    .split(" ")
    .map((part) => {
      const [, sig] = part.split(",");
      return sig?.trim() || "";
    })
    .filter(Boolean);

  return candidates.some((sig) => {
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

/** Auth alternative : Bearer RESEND_WEBHOOK_SECRET (ops simplifiée). */
export function verifyResendWebhookBearer(request: Request): boolean {
  const secret = getResendWebhookSecret();
  if (!secret || secret.startsWith("whsec_")) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export type ResendWebhookEventType =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.delivery_delayed"
  | string;

export type ResendWebhookPayload = {
  type?: ResendWebhookEventType;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { message?: string };
  };
};

export function mapResendEventToInvitationStatus(
  type: string,
): "delivered" | "bounced" | "complained" | null {
  switch (type) {
    case "email.delivered":
      return "delivered";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    default:
      return null;
  }
}
