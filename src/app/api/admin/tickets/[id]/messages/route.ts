import { NextResponse } from "next/server";
import { requireAdminAuth, getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  addTicketMessage,
  createMessageSchema,
  getTicketById,
  listTicketMessages,
} from "@/lib/tickets";
import { notifyTicketClientOfReply } from "@/lib/ticket-notifications";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });

    const messages = await listTicketMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[api/admin/tickets/messages] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });

    const body = await request.json();
    const session = await getAdminSession();
    const parsed = createMessageSchema.safeParse({
      ...body,
      authorType: "staff",
      authorName: body.authorName ?? session?.name ?? "Équipe SD CREATIV",
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const message = await addTicketMessage(id, parsed.data);
    const updated = await getTicketById(id);

    if (updated && parsed.data.authorType === "staff" && parsed.data.notifyClient !== false) {
      void notifyTicketClientOfReply(updated, message).catch((err) => {
        console.error("[api/admin/tickets/messages] notify client", err);
      });
    }

    return NextResponse.json({ message, ticket: updated }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/tickets/messages] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
