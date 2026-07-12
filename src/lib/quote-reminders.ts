import type { Quote } from "@/lib/quotes";
import { getQuoteById, listQuotesFiltered, updateQuote } from "@/lib/quotes";
import { buildQuoteReminderEmailHtml } from "@/lib/quote-email";
import { sendEmail } from "@/lib/email";
import { isWhatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";
import { markRemindersFired, listFiredReminderKeysForChannel } from "@/lib/crm-reminders";
import { createTask } from "@/lib/tasks";
import { buildQuoteFollowUpDescription, buildTaskTitle } from "@/content/tasks-labels";
import { QUOTE_STATUS_LABELS, formatQuoteAmount } from "@/content/quotes-labels";
import { getLeadById } from "@/lib/leads";
import { notifyTaskAssignee } from "@/lib/task-notifications";

export const QUOTE_REMINDER_AFTER_DAYS = 7;
export const QUOTE_MAX_AUTO_REMINDERS = 3;

export type QuoteReminderCandidate = {
  quote: Quote;
  reminderKey: string;
  reminderIndex: number;
};

export function buildQuoteReminderKey(quoteId: string, reminderIndex: number): string {
  return `quote-auto:${quoteId}:${reminderIndex}`;
}

function getReminderCount(quote: Quote): number {
  const count = quote.metadata.reminderCount;
  return typeof count === "number" ? count : 0;
}

export async function listQuoteReminderCandidates(
  now = new Date(),
): Promise<QuoteReminderCandidate[]> {
  const quotes = await listQuotesFiltered();
  const candidates: QuoteReminderCandidate[] = [];

  for (const quote of quotes) {
    if (!["sent", "negotiation", "viewed", "follow_up"].includes(quote.status)) continue;
    if (!quote.sentAt) continue;

    const reminderCount = getReminderCount(quote);
    if (reminderCount >= QUOTE_MAX_AUTO_REMINDERS) continue;

    const sentAt = new Date(quote.sentAt);
    const daysSinceSent = (now.getTime() - sentAt.getTime()) / 86_400_000;
    const requiredDays = QUOTE_REMINDER_AFTER_DAYS * (reminderCount + 1);
    if (daysSinceSent < requiredDays) continue;

    const lastAt = quote.metadata.lastAutoReminderAt;
    if (typeof lastAt === "string") {
      const daysSinceLast = (now.getTime() - new Date(lastAt).getTime()) / 86_400_000;
      if (daysSinceLast < QUOTE_REMINDER_AFTER_DAYS) continue;
    }

    candidates.push({
      quote,
      reminderIndex: reminderCount,
      reminderKey: buildQuoteReminderKey(quote.id, reminderCount),
    });
  }

  return candidates;
}

export async function sendQuoteAutoReminder(
  quote: Quote,
  reminderIndex: number,
): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const html = buildQuoteReminderEmailHtml(quote, siteUrl);

  const sent = await sendEmail({
    to: quote.email,
    subject: `Relance — Devis ${quote.reference} — SD CREATIV`,
    html,
    replyTo: fromEmail,
  });

  if (!sent) return false;

  if (isWhatsAppConfigured() && quote.phone) {
    await sendWhatsApp(
      quote.phone,
      `Bonjour ${quote.name}, rappel : votre devis ${quote.reference} SD CREATIV est en attente. Répondez à cet email ou contactez-nous.`,
    );
  }

  await updateQuote(quote.id, {
    status: "follow_up",
    followUpAt: new Date().toISOString(),
    metadata: {
      reminderCount: reminderIndex + 1,
      lastAutoReminderAt: new Date().toISOString(),
      lastAutoReminderReference: quote.reference,
    },
  });

  return true;
}

async function createQuoteFollowUpTask(quote: Quote, reminderIndex: number): Promise<void> {
  if (reminderIndex > 0) return;

  const lead = quote.leadId ? await getLeadById(quote.leadId) : null;
  const assignee = lead?.assignee ?? null;
  if (!assignee) return;

  const sentDaysAgo = quote.sentAt
    ? Math.max(0, Math.floor((Date.now() - new Date(quote.sentAt).getTime()) / 86_400_000))
    : null;

  const title = buildTaskTitle({
    categoryId: "quote_follow_up",
    clientName: quote.company || quote.name,
    quoteReference: quote.reference,
  });

  const task = await createTask({
    title,
    status: "todo",
    description: buildQuoteFollowUpDescription({
      quoteReference: quote.reference,
      amountLabel: formatQuoteAmount(quote.subtotal),
      statusLabel: QUOTE_STATUS_LABELS[quote.status],
      sentDaysAgo,
    }),
    assignee,
    clientId: quote.clientId,
    leadId: quote.leadId,
    priority: "high",
    dueDate: new Date().toISOString().slice(0, 10),
    metadata: { quoteReference: quote.reference, quoteId: quote.id, autoCreated: true },
  });

  await notifyTaskAssignee(task, "assigned", { actorName: "Automatisation CRM" });
}

export async function processQuoteAutoReminders(now = new Date()): Promise<{
  sent: number;
  skipped: number;
}> {
  const candidates = await listQuoteReminderCandidates(now);
  if (candidates.length === 0) return { sent: 0, skipped: 0 };

  const fired = await listFiredReminderKeysForChannel(
    candidates.map((c) => c.reminderKey),
    "email",
  );

  let sent = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (fired.has(candidate.reminderKey)) {
      skipped += 1;
      continue;
    }

    const quote = await getQuoteById(candidate.quote.id);
    if (!quote) continue;

    const ok = await sendQuoteAutoReminder(quote, candidate.reminderIndex);
    if (!ok) {
      skipped += 1;
      continue;
    }

    try {
      await createQuoteFollowUpTask(quote, candidate.reminderIndex);
    } catch {
      /* tâche auto optionnelle */
    }

    await markRemindersFired([
      {
        key: candidate.reminderKey,
        itemId: quote.id,
        itemType: "quote",
        title: `Relance devis ${quote.reference}`,
        triggerAt: now.toISOString(),
        channels: ["email"],
      },
    ]);

    sent += 1;
  }

  return { sent, skipped };
}
