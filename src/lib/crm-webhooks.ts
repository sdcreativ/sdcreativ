import { getCrmSecuritySettings } from "@/lib/crm-security-settings";

export type CrmWebhookEvent =
  | "lead.created"
  | "ticket.sla_breached"
  | "quote.signed"
  | "invoice.paid"
  | "client.created";

export async function dispatchCrmWebhook(
  event: CrmWebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const settings = await getCrmSecuritySettings();
  const { webhooks } = settings;

  if (event === "lead.created" && !webhooks.notifyLeadCreated) return;
  if (event === "ticket.sla_breached" && !webhooks.notifyTicketSla) return;
  if (event === "quote.signed" && !webhooks.notifyQuoteSigned) return;
  if (event === "invoice.paid" && !webhooks.notifyInvoicePaid) return;
  if (event === "client.created" && !webhooks.notifyClientCreated) return;

  const body = JSON.stringify({
    event,
    ...payload,
    at: new Date().toISOString(),
  });

  const text =
    event === "lead.created"
      ? `🎯 Nouveau lead CRM : ${String(payload.title ?? payload.name ?? "—")}`
      : event === "quote.signed"
        ? `✅ Devis signé : ${String(payload.reference ?? "—")}`
        : event === "invoice.paid"
          ? `💰 Facture payée : ${String(payload.reference ?? "—")}`
          : event === "client.created"
            ? `👤 Nouveau client : ${String(payload.name ?? "—")}`
            : `⚠️ SLA ticket dépassé : ${String(payload.title ?? payload.reference ?? "—")}`;

  const tasks: Promise<Response>[] = [];

  if (webhooks.genericUrl) {
    tasks.push(
      fetch(webhooks.genericUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );
  }

  if (webhooks.slackUrl) {
    tasks.push(
      fetch(webhooks.slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    );
  }

  if (webhooks.discordUrl) {
    tasks.push(
      fetch(webhooks.discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      }),
    );
  }

  await Promise.allSettled(tasks);
}
