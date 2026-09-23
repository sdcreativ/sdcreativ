import { NextResponse } from "next/server";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { getBusinessCardByToken, recordBusinessCardView } from "@/lib/business-cards";
import { isPublicCardToken } from "@/lib/business-card-public";
import {
  PUBLIC_CARD_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  if (!isBusinessCardsEnabled()) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }
  const limited = consumeRateLimit("public-card-view", getClientIp(request), PUBLIC_CARD_RATE_LIMIT);
  if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

  const { token } = await params;
  if (!isPublicCardToken(token)) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const card = await getBusinessCardByToken(token);
  if (!card?.active) return NextResponse.json({ ok: true });

  await recordBusinessCardView(card.id, {
    userAgent: request.headers.get("user-agent") ?? "",
    country: request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country"),
    referrer: request.headers.get("referer"),
  });

  return NextResponse.json({ ok: true });
}
