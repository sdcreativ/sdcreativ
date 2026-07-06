import { NextResponse } from "next/server";
import { loadPortalPaymentsPayload } from "@/lib/client-portal-db";
import { getClientSessionFromCookies } from "@/lib/documents-auth";

export async function GET() {
  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const payload = await loadPortalPaymentsPayload(session.clientId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/espace-client/payments] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
