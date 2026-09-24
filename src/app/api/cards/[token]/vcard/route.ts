import { NextResponse } from "next/server";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { getBusinessCardByToken, getPublicBusinessCard } from "@/lib/business-cards";
import {
  buildVcard,
  businessCardPublicUrl,
  isPublicCardToken,
  vcardDisposition,
  vcardFilename,
} from "@/lib/business-card-public";
import {
  PUBLIC_CARD_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!isBusinessCardsEnabled()) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }
  const limited = consumeRateLimit("public-card-vcard", getClientIp(request), PUBLIC_CARD_RATE_LIMIT);
  if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.vcf$/i, "");
  if (!isPublicCardToken(token)) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const record = await getBusinessCardByToken(token);
  if (!record) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const card = getPublicBusinessCard(record);
  if (card.status !== "active") {
    return NextResponse.json({ error: "Cette carte n'est plus active." }, { status: 410 });
  }

  const body = buildVcard(card, businessCardPublicUrl(token));
  const bytes = Buffer.from(body, "utf8");
  const filename = vcardFilename(card.name).replace(/"/g, "");
  const disposition = vcardDisposition(request.headers.get("user-agent") ?? "");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Content-Length": String(bytes.length),
    },
  });
}
