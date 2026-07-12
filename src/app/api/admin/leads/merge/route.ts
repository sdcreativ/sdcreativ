import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { mergeLeads } from "@/lib/leads";

const mergeSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.leads.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = mergeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    if (parsed.data.sourceId === parsed.data.targetId) {
      return NextResponse.json({ error: "Impossible de fusionner un lead avec lui-même." }, { status: 400 });
    }

    const lead = await mergeLeads(parsed.data.sourceId, parsed.data.targetId);
    if (!lead) {
      return NextResponse.json({ error: "Fusion impossible — lead introuvable." }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[api/admin/leads/merge] POST", error);
    const message =
      error instanceof Error && /lead_id|unique|duplicate key/i.test(error.message)
        ? "Fusion impossible — conflit de données liées (devis ou client). Réessayez ou contactez le support."
        : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
