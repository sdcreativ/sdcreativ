import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createPromoCampaign,
  createPromoCampaignSchema,
  listPromoCampaigns,
  previewPromoAudience,
} from "@/lib/promo-campaigns";

export async function GET(request: Request) {
  const authError = await crmApiAuth.marketing.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("audience") === "1") {
      const audience = await previewPromoAudience();
      return NextResponse.json({ audience });
    }
    const campaigns = await listPromoCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[api/admin/promo-campaigns] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.marketing.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createPromoCampaignSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const session = await getAdminSession();
    const createdBy =
      session && session.userId !== "legacy" ? session.userId : null;

    const campaign = await createPromoCampaign(parsed.data, createdBy);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/promo-campaigns] POST", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
