import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { apiKeyHasScope, verifyApiKeyFromRequest } from "@/lib/api-keys";
import { createLead, createLeadSchema } from "@/lib/leads";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const key = await verifyApiKeyFromRequest(request);
  if (!key || !apiKeyHasScope(key.scopes, "leads:write")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const lead = await createLead({ ...parsed.data, source: parsed.data.source ?? "manual" });
    if (!lead) {
      return NextResponse.json({ error: "Création impossible." }, { status: 500 });
    }
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("[api/v1/leads] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
