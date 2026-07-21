import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { verifyPromoEnrollmentToken } from "@/lib/promo-campaign-token";
import { confirmPromoEnrollment } from "@/lib/promo-campaigns";

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

    const result = await confirmPromoEnrollment(verified.enrollmentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/promo/[token]/confirm] POST", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
