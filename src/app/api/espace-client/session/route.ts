import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildClientProfileAsync } from "@/lib/client-portal-db";
import { CLIENT_TOKEN_COOKIE, getClientSessionFromCookies } from "@/lib/documents-auth";

/** Sonde de session portail — 200 même si invité (évite 401 bruyant en dev). */
export async function GET() {
  const session = await getClientSessionFromCookies();

  if (!session) {
    return NextResponse.json({ authenticated: false as const });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;
  const profile = await buildClientProfileAsync(
    session.crmPortalId,
    session.loginClientId,
    token,
  );

  return NextResponse.json({
    authenticated: true as const,
    clientId: session.loginClientId,
    crmPortalId: session.crmPortalId,
    profile,
  });
}
