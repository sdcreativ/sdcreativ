import { NextResponse } from "next/server";
import { buildClientProfileAsync } from "@/lib/client-portal-db";
import { getClientSessionFromCookies } from "@/lib/documents-auth";

/** Sonde de session portail — 200 même si invité (évite 401 bruyant en dev). */
export async function GET() {
  const session = await getClientSessionFromCookies();

  if (!session) {
    return NextResponse.json({ authenticated: false as const });
  }

  const profile = await buildClientProfileAsync(session.clientId);

  return NextResponse.json({
    authenticated: true as const,
    clientId: session.clientId,
    profile,
  });
}
