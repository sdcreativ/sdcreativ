import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getPromoCampaignById,
  listCampaignEnrollments,
  updatePromoCampaign,
  updatePromoCampaignSchema,
} from "@/lib/promo-campaigns";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.marketing.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const campaign = await getPromoCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    }
    const enrollments = await listCampaignEnrollments(id);
    return NextResponse.json({ campaign, enrollments });
  } catch (error) {
    console.error("[api/admin/promo-campaigns/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.marketing.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePromoCampaignSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const campaign = await updatePromoCampaign(id, parsed.data);
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    }
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[api/admin/promo-campaigns/[id]] PATCH", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
