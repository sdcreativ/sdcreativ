import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { verifyPromoEnrollmentToken } from "@/lib/promo-campaign-token";
import { markPromoEnrollmentClicked } from "@/lib/promo-campaigns";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await params;
    const verified = verifyPromoEnrollmentToken(decodeURIComponent(token));
    if (!verified) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
    }
    await markPromoEnrollmentClicked(verified.enrollmentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/promo/[token]/click] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
