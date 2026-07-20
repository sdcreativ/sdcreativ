import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listPortalOffers, requestPortalOffer } from "@/lib/portal-offers";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }
  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const offers = await listPortalOffers();
    return NextResponse.json({ offers });
  } catch (error) {
    console.error("[api/espace-client/offers] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

const requestSchema = z.object({
  offerId: z.string().trim().min(1).max(80),
  offerName: z.string().trim().min(2).max(200),
  message: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }
  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = requestSchema.parse(await request.json());
    const result = await requestPortalOffer({
      portalClientId: session.crmPortalId,
      offerId: body.offerId,
      offerName: body.offerName,
      message: body.message,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    console.error("[api/espace-client/offers] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Demande impossible." },
      { status: 400 },
    );
  }
}
