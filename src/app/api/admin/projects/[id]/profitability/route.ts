import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getProjectProfitability } from "@/lib/projects/profitability";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const profitability = await getProjectProfitability(id);
    if (!profitability) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }
    return NextResponse.json({ profitability });
  } catch (error) {
    console.error("[api/admin/projects/profitability] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
