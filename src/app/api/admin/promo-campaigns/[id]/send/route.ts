import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { sendCampaignEmails } from "@/lib/promo-campaigns";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const authError = await crmApiAuth.marketing.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    let limit = 100;
    try {
      const body = (await request.json()) as { limit?: number };
      if (typeof body.limit === "number" && body.limit > 0) {
        limit = Math.min(200, Math.floor(body.limit));
      }
    } catch {
      // body optional
    }

    const result = await sendCampaignEmails(id, { limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/promo-campaigns/[id]/send] POST", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
