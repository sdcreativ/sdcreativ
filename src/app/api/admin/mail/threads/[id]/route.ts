import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { getClientById } from "@/lib/clients";
import { isDatabaseConfigured } from "@/lib/db";
import { getLeadById } from "@/lib/leads";
import {
  getMailDraft,
  getMailThreadById,
  linkMailThread,
  listMailAttachmentsByMessageIds,
  listMailMessagesByThreadId,
  markMailThreadRead,
} from "@/lib/mail/repository";

type RouteContext = { params: Promise<{ id: string }> };

const linkSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const markRead = searchParams.get("markRead") !== "0";

    let thread = await getMailThreadById(id);
    if (!thread) {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }

    if (markRead && thread.unreadCount > 0) {
      thread = (await markMailThreadRead(id)) ?? thread;
    }

    const messages = await listMailMessagesByThreadId(id);
    const attachments = await listMailAttachmentsByMessageIds(
      messages.map((m) => m.id),
    );

    const session = await getAdminSession();
    const draft = session?.userId
      ? await getMailDraft(id, session.userId)
      : null;

    const [linkedClient, linkedLead] = await Promise.all([
      thread.clientId ? getClientById(thread.clientId) : null,
      thread.leadId ? getLeadById(thread.leadId) : null,
    ]);

    const safeMessages = messages.map((msg) => {
      // Strip rawHeaders — ne pas exposer au client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit intentionally
      const { rawHeaders, ...rest } = msg;
      return rest;
    });

    return NextResponse.json({
      thread,
      messages: safeMessages,
      attachments,
      draft,
      linkedClient: linkedClient
        ? { id: linkedClient.id, name: linkedClient.name, email: linkedClient.email }
        : null,
      linkedLead: linkedLead
        ? { id: linkedLead.id, name: linkedLead.name, email: linkedLead.email }
        : null,
    });
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Associe / dissocie client ou lead. Permission mail.write. */
export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.write" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const existing = await getMailThreadById(id);
    if (!existing) {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    if (parsed.data.clientId === undefined && parsed.data.leadId === undefined) {
      return NextResponse.json(
        { error: "Indiquez clientId et/ou leadId (null pour dissocier)." },
        { status: 400 },
      );
    }

    if (parsed.data.clientId) {
      const client = await getClientById(parsed.data.clientId);
      if (!client) {
        return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
      }
    }
    if (parsed.data.leadId) {
      const lead = await getLeadById(parsed.data.leadId);
      if (!lead) {
        return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
      }
    }

    // Si on lie un client, on peut garder le lead ; l’UI envoie souvent les deux.
    const thread = await linkMailThread({
      threadId: id,
      clientId: parsed.data.clientId,
      leadId: parsed.data.leadId,
    });

    await auditCrmAction({
      action: "link",
      entityType: "mail_thread",
      entityId: id,
      summary: `Liaison messagerie mise à jour`,
      metadata: {
        clientId: parsed.data.clientId ?? existing.clientId,
        leadId: parsed.data.leadId ?? existing.leadId,
      },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
