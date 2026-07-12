import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listPortalProjects } from "@/lib/client-portal-db";
import { CLIENT_TOKEN_COOKIE, getClientSessionFromCookies } from "@/lib/documents-auth";
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
    const cookieStore = await cookies();
    const token = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;
    const projects = await listPortalProjects(session.crmPortalId, token);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[api/espace-client/projects] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
