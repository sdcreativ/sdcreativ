import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";
import { recordPopupEvent } from "@/lib/site-popups";
import { popupEventSchema } from "@/lib/site-popups-types";
import { isDatabaseConfigured } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

/** Statistiques : affichage / fermeture (anonymes, limitées par IP). */
export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  if (!UUID.test(id) || !isDatabaseConfigured()) return NextResponse.json({ ok: false }, { status: 400 });
  const limited = consumeRateLimit("public-popup-event", getClientIp(request), { limit: 60, windowMs: 60 * 60 * 1000 });
  if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);
  const parsed = popupEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordPopupEvent(id, parsed.data.type);
  return NextResponse.json({ ok: true });
}
