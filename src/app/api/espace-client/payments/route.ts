import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadPortalPaymentsPayload } from "@/lib/client-portal-db";
import { CLIENT_TOKEN_COOKIE, getClientSessionFromCookies } from "@/lib/documents-auth";

export async function GET() {
  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;
    const payload = await loadPortalPaymentsPayload(
      session.crmPortalId,
      session.loginClientId,
      token,
    );
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/espace-client/payments] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
