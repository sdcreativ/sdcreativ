import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  addTicketMessage,
  createMessageSchema,
  getTicketById,
  listTicketMessages,
} from "@/lib/tickets";
import { buildClientProfileAsync } from "@/lib/client-portal-db";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket || ticket.portalClientId !== session.loginClientId) {
      return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    }

    const messages = await listTicketMessages(id);
    return NextResponse.json({ messages, ticket });
  } catch (error) {
    console.error("[api/espace-client/tickets/messages] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket || ticket.portalClientId !== session.loginClientId) {
      return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    }

    const profile = await buildClientProfileAsync(
      session.crmPortalId,
      session.loginClientId,
    );
    const body = await request.json();
    const parsed = createMessageSchema.safeParse({
      content: body.content,
      authorType: "client",
      authorName: profile.name,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const message = await addTicketMessage(id, parsed.data);
    const updated = await getTicketById(id);
    return NextResponse.json({ message, ticket: updated }, { status: 201 });
  } catch (error) {
    console.error("[api/espace-client/tickets/messages] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
