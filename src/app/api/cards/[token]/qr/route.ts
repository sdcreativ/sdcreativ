import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { getBusinessCardByToken } from "@/lib/business-cards";
import { businessCardPublicUrl, isPublicCardToken } from "@/lib/business-card-public";
import {
  PUBLIC_CARD_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

const QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#111111", light: "#ffffff" },
};

export async function GET(request: Request, { params }: Params) {
  if (!isBusinessCardsEnabled()) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const ip = getClientIp(request);
  const limited = consumeRateLimit("public-card-qr", ip, PUBLIC_CARD_RATE_LIMIT);
  if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

  const { token } = await params;
  if (!isPublicCardToken(token)) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const card = await getBusinessCardByToken(token);
  if (!card?.active) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const url = businessCardPublicUrl(token);
  const format = new URL(request.url).searchParams.get("format");

  if (format === "svg") {
    const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="carte-${token}.svg"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const png = await QRCode.toBuffer(url, { ...QR_OPTIONS, type: "png", width: 640 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": format === "download" ? "public, max-age=3600" : "public, max-age=3600",
      ...(format === "download"
        ? { "Content-Disposition": `attachment; filename="carte-${token}.png"` }
        : {}),
    },
  });
}
