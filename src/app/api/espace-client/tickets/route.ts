import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { buildClientProfileAsync } from "@/lib/client-portal-db";
import { isDatabaseConfigured } from "@/lib/db";
import { createTicket, createTicketSchema, listTickets } from "@/lib/tickets";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const tickets = await listTickets({ portalClientId: session.clientId });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("[api/espace-client/tickets] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const profile = await buildClientProfileAsync(session.clientId);
    const body = await request.json();

    const parsed = createTicketSchema.safeParse({
      ...body,
      portalClientId: session.clientId,
      clientName: profile.name,
      clientEmail: body.clientEmail ?? `${session.clientId}@client.local`,
      authorType: "client",
      authorName: profile.name,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const ticket = await createTicket(parsed.data);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("[api/espace-client/tickets] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
