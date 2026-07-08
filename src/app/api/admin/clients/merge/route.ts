import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { mergeClients } from "@/lib/clients";

const mergeSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.clients.write();
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
      return NextResponse.json({ error: "Impossible de fusionner une fiche avec elle-même." }, { status: 400 });
    }

    const client = await mergeClients(parsed.data.sourceId, parsed.data.targetId);
    if (!client) {
      return NextResponse.json({ error: "Fusion impossible — fiche introuvable." }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error("[api/admin/clients/merge] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
