import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteTicket,
  getTicketById,
  updateTicket,
  updateTicketSchema,
} from "@/lib/tickets";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.tickets.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("[api/admin/tickets/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.tickets.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTicketSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const ticket = await updateTicket(id, parsed.data);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("[api/admin/tickets/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.tickets.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteTicket(id);
    if (!deleted) return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/tickets/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
