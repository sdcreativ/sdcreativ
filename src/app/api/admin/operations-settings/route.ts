import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getOperationsSettings,
  updateOperationsSettings,
  updateOperationsSettingsSchema,
} from "@/lib/operations-settings";

export async function GET() {
  const authError = await crmApiAuth.settings.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const operations = await getOperationsSettings();
    return NextResponse.json({ operations });
  } catch (error) {
    console.error("[api/admin/operations-settings] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateOperationsSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const operations = await updateOperationsSettings(parsed.data);
    return NextResponse.json({ operations });
  } catch (error) {
    console.error("[api/admin/operations-settings] PUT", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
