import { NextResponse } from "next/server";
import { dispatchCrmWebhook } from "@/lib/crm-webhooks";
import {
  listFiredReminderKeysForChannel,
  markRemindersFired,
} from "@/lib/crm-reminders";
import { isDatabaseConfigured } from "@/lib/db";
import { listTickets } from "@/lib/tickets";

/** Cron externe — notifie Slack/Discord/webhook générique pour les tickets SLA dépassés (une fois par ticket). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const breached = await listTickets({ slaBreached: true });
    if (breached.length === 0) {
      return NextResponse.json({ dispatched: 0, message: "Aucun SLA dépassé." });
    }

    const keys = breached.map((t) => `ticket-sla-webhook-${t.id}`);
    const fired = await listFiredReminderKeysForChannel(keys, "webhook");
    const pending = breached.filter((t) => !fired.has(`ticket-sla-webhook-${t.id}`));

    if (pending.length === 0) {
      return NextResponse.json({ dispatched: 0, message: "Webhooks déjà envoyés." });
    }

    const now = new Date().toISOString();
    for (const ticket of pending) {
      await dispatchCrmWebhook("ticket.sla_breached", {
        ticketId: ticket.id,
        reference: ticket.reference,
        title: ticket.subject,
        clientName: ticket.clientName,
        priority: ticket.priority,
        assignee: ticket.assignee,
        slaDueAt: ticket.slaDueAt,
      });
    }

    await markRemindersFired(
      pending.map((ticket) => ({
        key: `ticket-sla-webhook-${ticket.id}`,
        itemId: ticket.id,
        itemType: "ticket_sla",
        title: ticket.subject,
        triggerAt: ticket.slaDueAt ?? now,
        channels: ["webhook"],
      })),
    );

    return NextResponse.json({ dispatched: pending.length });
  } catch (error) {
    console.error("[api/cron/ticket-sla-webhooks] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
