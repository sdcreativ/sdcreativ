import { NextResponse } from "next/server";
import { loadPortalProjectPayload } from "@/lib/client-portal-db";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const payload = await loadPortalProjectPayload(session.clientId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/espace-client/project] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
