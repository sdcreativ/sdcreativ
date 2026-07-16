import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { getClientById } from "@/lib/clients";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getMailThreadById,
  listMailMessagesByThreadId,
} from "@/lib/mail/repository";
import { extractEmailAddress } from "@/lib/mail/threading";
import { createTicket } from "@/lib/tickets";

type RouteContext = { params: Promise<{ id: string }> };

/** Crée un ticket support depuis le thread (lié au client si présent). */
export async function POST(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({
    anyPermission: ["mail.write", "tickets.write"],
  });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const thread = await getMailThreadById(id);
    if (!thread) {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }

    const messages = await listMailMessagesByThreadId(id);
    const inbound = [...messages].reverse().find((m) => m.direction === "inbound");
    const fromRaw = inbound?.fromAddress ?? thread.participants[0] ?? "";
    const email = extractEmailAddress(fromRaw);

    let clientName = email.split("@")[0] || "Client";
    let clientEmail = email.includes("@") ? email : "inconnu@invalid";
    let clientId = thread.clientId;
    let portalClientId: string | null = null;

    if (thread.clientId) {
      const client = await getClientById(thread.clientId);
      if (client) {
        clientName = client.name;
        clientEmail = client.email;
        clientId = client.id;
        portalClientId = client.portalClientId;
      }
    } else if (fromRaw) {
      const display = fromRaw.match(/^([^<]+)</);
      if (display?.[1]?.trim() && !display[1].includes("@")) {
        clientName = display[1].trim();
      }
    }

    const session = await getAdminSession();
    const initialMessage =
      inbound?.bodyText?.trim().slice(0, 5000) ||
      thread.snippet ||
      "Ticket créé depuis la messagerie.";

    const ticket = await createTicket({
      subject: thread.subject.slice(0, 200) || "Demande depuis messagerie",
      clientName,
      clientEmail,
      clientId: clientId ?? null,
      portalClientId,
      initialMessage,
      authorName: session?.name || "CRM",
      authorType: "staff",
      category: "technical",
      priority: "normal",
      status: "open",
    });

    await auditCrmAction({
      action: "create",
      entityType: "ticket",
      entityId: ticket.id,
      summary: `Ticket créé depuis messagerie : ${ticket.reference}`,
      metadata: { mailThreadId: id },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]/create-ticket] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
