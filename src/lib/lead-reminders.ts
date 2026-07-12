import { listLeadsPaginated, updateLead, type Lead } from "@/lib/leads";
import { createLeadActivity } from "@/lib/lead-activities";
import { sendEmail, htmlRow } from "@/lib/email";
import { markRemindersFired, listFiredReminderKeysForChannel } from "@/lib/crm-reminders";
import { getCrmUserEmailByName } from "@/lib/crm-users";

export const LEAD_INACTIVE_AFTER_DAYS = 5;

export function buildLeadInactiveReminderKey(leadId: string): string {
  return `lead-inactive:${leadId}`;
}

export async function listInactiveLeadCandidates(now = new Date()): Promise<Lead[]> {
  const { leads } = await listLeadsPaginated({
    status: "contacted",
    page: 1,
    pageSize: 500,
  });

  const candidates: Lead[] = [];
  for (const lead of leads) {
    const updatedAt = new Date(lead.updatedAt);
    const daysSince = (now.getTime() - updatedAt.getTime()) / 86_400_000;
    if (daysSince < LEAD_INACTIVE_AFTER_DAYS) continue;
    if (lead.metadata?.lastInactiveReminderAt) continue;
    candidates.push(lead);
  }
  return candidates;
}

export async function sendLeadInactiveReminder(lead: Lead): Promise<boolean> {
  const assigneeEmail = lead.assignee ? await getCrmUserEmailByName(lead.assignee) : null;
  const to = assigneeEmail ?? process.env.CONTACT_FROM_EMAIL;
  if (!to) return false;

  const sent = await sendEmail({
    to,
    subject: `[CRM] Lead inactif — ${lead.company || lead.name}`,
    html: `
      <h2>Lead sans activité récente</h2>
      ${htmlRow("Contact", lead.name)}
      ${htmlRow("Email", lead.email)}
      ${lead.company ? htmlRow("Entreprise", lead.company) : ""}
      ${lead.assignee ? htmlRow("Assigné à", lead.assignee) : ""}
      <p>Pensez à relancer ce lead (aucune mise à jour depuis ${LEAD_INACTIVE_AFTER_DAYS}+ jours).</p>
    `,
  });

  if (!sent) return false;

  await updateLead(lead.id, {
    metadata: {
      ...lead.metadata,
      lastInactiveReminderAt: new Date().toISOString(),
    },
  });

  await createLeadActivity({
    leadId: lead.id,
    type: "note",
    subject: "Relance automatique — lead inactif",
    content: `Alerte envoyée après ${LEAD_INACTIVE_AFTER_DAYS} jours sans activité.`,
  });

  return true;
}

export async function processLeadInactiveReminders(now = new Date()): Promise<{
  sent: number;
  skipped: number;
}> {
  const candidates = await listInactiveLeadCandidates(now);
  if (candidates.length === 0) return { sent: 0, skipped: 0 };

  const keys = candidates.map((l) => buildLeadInactiveReminderKey(l.id));
  const fired = await listFiredReminderKeysForChannel(keys, "email");

  let sent = 0;
  let skipped = 0;

  for (const lead of candidates) {
    const key = buildLeadInactiveReminderKey(lead.id);
    if (fired.has(key)) {
      skipped += 1;
      continue;
    }

    const ok = await sendLeadInactiveReminder(lead);
    if (!ok) {
      skipped += 1;
      continue;
    }

    await markRemindersFired([
      {
        key,
        itemId: lead.id,
        itemType: "lead",
        title: `Lead inactif — ${lead.name}`,
        triggerAt: now.toISOString(),
        channels: ["email"],
      },
    ]);
    sent += 1;
  }

  return { sent, skipped };
}
