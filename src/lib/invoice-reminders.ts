import type { Invoice } from "@/lib/invoices";
import {
  getInvoiceById,
  getInvoiceRemaining,
  listInvoices,
  syncOverdueInvoices,
  updateInvoice,
} from "@/lib/invoices";
import { buildInvoicePaymentReminderHtml } from "@/lib/invoice-email";
import { sendEmail } from "@/lib/email";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";

export const INVOICE_REMINDER_AFTER_DAYS = 3;
export const INVOICE_MAX_PAYMENT_REMINDERS = 3;

export type InvoiceReminderCandidate = {
  invoice: Invoice;
  reminderKey: string;
  reminderIndex: number;
};

export function buildInvoiceReminderKey(invoiceId: string, reminderIndex: number): string {
  return `invoice-payment:${invoiceId}:${reminderIndex}`;
}

function getReminderCount(invoice: Invoice): number {
  const count = invoice.metadata.paymentReminderCount;
  return typeof count === "number" ? count : 0;
}

export async function listInvoicePaymentReminderCandidates(
  now = new Date(),
): Promise<InvoiceReminderCandidate[]> {
  await syncOverdueInvoices();
  const invoices = await listInvoices();
  const candidates: InvoiceReminderCandidate[] = [];

  for (const invoice of invoices) {
    if (!["sent", "overdue"].includes(invoice.status)) continue;
    const remaining = getInvoiceRemaining(invoice);
    if (remaining <= 0) continue;
    if (!invoice.dueDate) continue;

    const due = new Date(`${invoice.dueDate}T23:59:59`);
    if (due.getTime() > now.getTime()) continue;

    const reminderCount = getReminderCount(invoice);
    if (reminderCount >= INVOICE_MAX_PAYMENT_REMINDERS) continue;

    const daysOverdue = (now.getTime() - due.getTime()) / 86_400_000;
    const requiredDays = INVOICE_REMINDER_AFTER_DAYS * (reminderCount + 1);
    if (daysOverdue < requiredDays) continue;

    const lastAt = invoice.metadata.lastPaymentReminderAt;
    if (typeof lastAt === "string") {
      const daysSinceLast = (now.getTime() - new Date(lastAt).getTime()) / 86_400_000;
      if (daysSinceLast < INVOICE_REMINDER_AFTER_DAYS) continue;
    }

    candidates.push({
      invoice,
      reminderIndex: reminderCount,
      reminderKey: buildInvoiceReminderKey(invoice.id, reminderCount),
    });
  }

  return candidates;
}

export async function sendInvoicePaymentReminder(
  invoice: Invoice,
  reminderIndex: number,
): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const html = buildInvoicePaymentReminderHtml(invoice, siteUrl);
  const remaining = getInvoiceRemaining(invoice);

  const sent = await sendEmail({
    to: invoice.email,
    subject: `Relance paiement — Facture ${invoice.reference} (${formatAmountShort(remaining)})`,
    html,
    replyTo: fromEmail,
  });

  if (!sent) return false;

  await updateInvoice(invoice.id, {
    status: invoice.status === "sent" ? "overdue" : undefined,
    metadata: {
      paymentReminderCount: reminderIndex + 1,
      lastPaymentReminderAt: new Date().toISOString(),
    },
  });

  return true;
}

function formatAmountShort(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export async function processInvoicePaymentReminders(now = new Date()): Promise<{
  sent: number;
  skipped: number;
}> {
  const candidates = await listInvoicePaymentReminderCandidates(now);
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

    const invoice = await getInvoiceById(candidate.invoice.id);
    if (!invoice || getInvoiceRemaining(invoice) <= 0) {
      skipped += 1;
      continue;
    }

    const ok = await sendInvoicePaymentReminder(invoice, candidate.reminderIndex);
    if (!ok) {
      skipped += 1;
      continue;
    }

    await markRemindersFired([
      {
        key: candidate.reminderKey,
        itemId: invoice.id,
        itemType: "invoice",
        title: `Relance facture ${invoice.reference}`,
        triggerAt: now.toISOString(),
        channels: ["email"],
      },
    ]);

    sent += 1;
  }

  return { sent, skipped };
}
