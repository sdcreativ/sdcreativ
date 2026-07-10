import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifyDocumentType = "quote" | "invoice";

function getSecret(): string {
  const secret = process.env.BILLING_VERIFY_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BILLING_VERIFY_SECRET ou CRON_SECRET requis en production.");
    }
    return "billing-verify-dev-only";
  }
  return secret;
}

export function buildVerifyToken(type: VerifyDocumentType, reference: string): string {
  return createHmac("sha256", getSecret())
    .update(`${type}:${reference}`)
    .digest("hex")
    .slice(0, 32);
}

export function isValidVerifyToken(
  type: VerifyDocumentType,
  reference: string,
  token: string | null | undefined,
): boolean {
  if (!token || token.length < 16) return false;
  const expected = buildVerifyToken(type, reference);
  const a = Buffer.from(expected);
  const b = Buffer.from(token.slice(0, 32));
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildPublicVerifyPath(
  type: "devis" | "facture",
  reference: string,
  token?: string,
): string {
  const apiType: VerifyDocumentType = type === "devis" ? "quote" : "invoice";
  const t = token ?? buildVerifyToken(apiType, reference);
  return `/verifier/${type}/${encodeURIComponent(reference)}?t=${t}`;
}

export function buildPublicVerifyUrl(
  type: "devis" | "facture",
  reference: string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  return `${siteUrl}${buildPublicVerifyPath(type, reference)}`;
}
