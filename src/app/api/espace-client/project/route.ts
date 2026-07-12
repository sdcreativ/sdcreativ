import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadPortalProjectPayload } from "@/lib/client-portal-db";
import { CLIENT_TOKEN_COOKIE, getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const cookieStore = await cookies();
    const token = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;
    const payload = await loadPortalProjectPayload(session.crmPortalId, token, projectId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/espace-client/project] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
