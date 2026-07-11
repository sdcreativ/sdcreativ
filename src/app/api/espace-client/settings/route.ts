import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getPortalSettingsPayload,
  updatePortalSettings,
  updatePortalSettingsSchema,
} from "@/lib/client-portal-settings";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const settings = await getPortalSettingsPayload(session.crmPortalId);
    if (!settings) {
      return NextResponse.json(
        { error: "Compte client non lié au CRM. Contactez votre interlocuteur SD CREATIV." },
        { status: 404 },
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[api/espace-client/settings] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updatePortalSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const settings = await updatePortalSettings(session.crmPortalId, parsed.data);
    if (!settings) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[api/espace-client/settings] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
