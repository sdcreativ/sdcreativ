import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { isBotUserAgent, marketingEventSchema, recordMarketingEvent } from "@/lib/marketing-events";

/** Compteur anonyme (visite, clic WhatsApp) envoyé par le site public — 204 dans tous les cas utiles. */
export async function POST(request: Request) {
  if (isBotUserAgent(request.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  // L'IP sert uniquement à limiter le débit, elle n'est jamais enregistrée.
  const limited = consumeRateLimit("public-track", getClientIp(request), { limit: 60, windowMs: 60_000 });
  if (limited.limited) return new NextResponse(null, { status: 204 });
  const parsed = marketingEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Événement invalide." }, { status: 400 });
  try {
    await recordMarketingEvent(parsed.data);
  } catch (error) {
    console.error("[api/public/track]", error);
  }
  return new NextResponse(null, { status: 204 });
}
