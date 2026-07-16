import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { isDatabaseConfigured } from "@/lib/db";
import { createLead } from "@/lib/leads";
import { linkMailThread, getMailThreadById, listMailMessagesByThreadId } from "@/lib/mail/repository";
import { extractEmailAddress } from "@/lib/mail/threading";
import { findLeadByMatchEmail, findClientByMatchEmail } from "@/lib/mail/link";

type RouteContext = { params: Promise<{ id: string }> };

function guessNameFromAddress(raw: string): string {
  const match = raw.match(/^([^<]+)</);
  if (match?.[1]?.trim() && !match[1].includes("@")) {
    return match[1].trim().slice(0, 160);
  }
  const email = extractEmailAddress(raw);
  const local = email.split("@")[0] ?? "Contact";
  return local.replace(/[._+]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "Contact";
}

/** Crée un lead depuis le thread et le lie. */
export async function POST(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({
    anyPermission: ["mail.write", "leads.write"],
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
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Aucune adresse email utilisable dans ce thread." },
        { status: 400 },
      );
    }

    const existingClient = await findClientByMatchEmail(email);
    if (existingClient) {
      const linked = await linkMailThread({
        threadId: id,
        clientId: existingClient.id,
        leadId: null,
      });
      return NextResponse.json({
        lead: null,
        linkedClient: existingClient,
        linkedLead: null,
        thread: linked,
        message: `Un client existe déjà pour ${email} — conversation liée au client.`,
      });
    }

    const existingLead = await findLeadByMatchEmail(email);
    if (existingLead) {
      const linked = await linkMailThread({
        threadId: id,
        leadId: existingLead.id,
      });
      return NextResponse.json({
        lead: {
          id: existingLead.id,
          name: existingLead.name,
          email: existingLead.email,
        },
        linkedClient: null,
        linkedLead: existingLead,
        thread: linked,
        message: "Lead existant lié à la conversation.",
      });
    }

    const lead = await createLead({
      name: guessNameFromAddress(fromRaw),
      email,
      source: "manual",
      status: "new",
      message: `Créé depuis messagerie : ${thread.subject}\n\n${inbound?.bodyText?.slice(0, 2000) ?? thread.snippet}`,
      metadata: { mailThreadId: id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Impossible de créer le lead." }, { status: 500 });
    }

    const linked = await linkMailThread({
      threadId: id,
      leadId: lead.id,
      clientId: null,
    });

    const session = await getAdminSession();
    await auditCrmAction({
      action: "create",
      entityType: "lead",
      entityId: lead.id,
      summary: `Lead créé depuis messagerie : ${lead.email}`,
      metadata: { mailThreadId: id, actor: session?.email ?? null },
    });

    return NextResponse.json(
      {
        lead,
        linkedClient: null,
        linkedLead: { id: lead.id, name: lead.name, email: lead.email },
        thread: linked,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]/create-lead] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
