import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createTicket, createTicketSchema, listTickets } from "@/lib/tickets";
import type { TicketPriority, TicketStatus } from "@/content/tickets-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.tickets.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TicketStatus | null;
    const clientId = searchParams.get("clientId");
    const priority = searchParams.get("priority") as TicketPriority | null;
    const assignee = searchParams.get("assignee");
    const sla = searchParams.get("sla");

    const tickets = await listTickets({
      status: status ?? undefined,
      clientId: clientId ?? undefined,
      priority: priority ?? undefined,
      assignee: assignee ?? undefined,
      slaBreached: sla === "breached" ? true : sla === "ok" ? false : undefined,
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("[api/admin/tickets] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.tickets.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createTicketSchema.safeParse({
      ...body,
      authorType: "staff",
      authorName: body.authorName ?? "Équipe SD CREATIV",
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const ticket = await createTicket(parsed.data);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/tickets] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
