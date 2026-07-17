import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getDealByLeadId, updateDealStage, updateDealStageSchema } from "@/lib/deals";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.deals.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const deal = await getDealByLeadId(id);
    if (!deal) {
      return NextResponse.json({ error: "Opportunité introuvable." }, { status: 404 });
    }
    return NextResponse.json({ deal });
  } catch (error) {
    console.error("[api/admin/deals/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.deals.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateDealStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const deal = await updateDealStage(id, parsed.data.stage);
    return NextResponse.json({ deal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    console.error("[api/admin/deals/[id]] PATCH", error);
    const status =
      message.includes("Impossible") || message.includes("introuvable") || message.includes("requis")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
