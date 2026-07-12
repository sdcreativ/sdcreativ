import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createLegalEntity,
  createLegalEntitySchema,
  listLegalEntities,
} from "@/lib/legal-entities";

export async function GET() {
  const authError = await crmApiAuth.settings.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const entities = await listLegalEntities();
    return NextResponse.json({ entities });
  } catch (error) {
    console.error("[api/admin/legal-entities] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createLegalEntitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const entity = await createLegalEntity(parsed.data);
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/legal-entities] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
