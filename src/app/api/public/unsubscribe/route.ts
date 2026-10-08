import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { unsubscribeEmail, verifyUnsubscribeToken } from "@/lib/email-unsubscribe";
import { PUBLIC_FORM_RATE_LIMIT, consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

/** GET (lien ouvert, y compris par un antivirus de messagerie) : simple redirection, aucune action. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/desinscription", url.origin);
  const token = url.searchParams.get("t");
  if (token) target.searchParams.set("t", token);
  return NextResponse.redirect(target, 303);
}

/**
 * POST : désinscription effective — bouton de la page /desinscription (JSON { t }) ou « un clic »
 * des messageries (RFC 8058 : jeton dans l'URL, corps List-Unsubscribe=One-Click).
 */
export async function POST(request: Request) {
  const limited = consumeRateLimit("public-unsubscribe", getClientIp(request), PUBLIC_FORM_RATE_LIMIT);
  if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

  let token = new URL(request.url).searchParams.get("t");
  if (!token && request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { t?: unknown } | null;
    token = typeof body?.t === "string" ? body.t : null;
  }
  const email = verifyUnsubscribeToken(token);
  if (!email) return NextResponse.json({ error: "Lien de désinscription invalide." }, { status: 400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Service indisponible." }, { status: 503 });

  try {
    await unsubscribeEmail(email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/public/unsubscribe]", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
