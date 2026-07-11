import { withDb } from "@/lib/db";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { logBillingEvent } from "@/lib/billing/events";
import { createAdminBillingNotification } from "@/lib/billing/notifications";
import { assertQuoteTransition, BillingWorkflowError } from "@/lib/billing/workflow";
import { markRemindersFired, listFiredReminderKeysForChannel } from "@/lib/crm-reminders";
import type { QuoteStatus } from "@/content/quotes-labels";

const EXPIRABLE_STATUSES: QuoteStatus[] = [
  "sent",
  "viewed",
  "follow_up",
  "negotiation",
];

export function buildQuoteExpirationKey(quoteId: string): string {
  return `quote-expired:${quoteId}`;
}

export async function listExpiringQuoteCandidates(now = new Date()): Promise<Quote[]> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM quotes
       WHERE status = ANY($1::text[])
         AND valid_until IS NOT NULL
         AND valid_until < $2
       ORDER BY valid_until ASC`,
      [EXPIRABLE_STATUSES, now.toISOString()],
    );

    const quotes: Quote[] = [];
    for (const row of rows) {
      const quote = await getQuoteById(row.id);
      if (quote) quotes.push(quote);
    }
    return quotes;
  });
}

async function expireQuote(quote: Quote): Promise<boolean> {
  try {
    assertQuoteTransition(quote.status, "expired");
  } catch (error) {
    if (error instanceof BillingWorkflowError) return false;
    throw error;
  }

  await withDb(async (query) => {
    await query(
      `UPDATE quotes SET status = 'expired', updated_at = NOW() WHERE id = $1`,
      [quote.id],
    );
  });

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.expired",
    actor: { type: "system", name: "Expiration automatique" },
    fromStatus: quote.status,
    toStatus: "expired",
    summary: `Devis ${quote.reference} expiré (validité dépassée).`,
    metadata: { validUntil: quote.validUntil },
  });

  await createAdminBillingNotification({
    eventType: "quote.expired",
    title: `Devis expiré — ${quote.reference}`,
    message: `Le devis ${quote.reference} a expiré le ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("fr-FR") : "—"}.`,
    linkHref: `/admin/crm/devis?id=${quote.id}`,
    entityType: "quote",
    entityId: quote.id,
  });

  return true;
}

export async function processQuoteExpirations(now = new Date()): Promise<{
  expired: number;
  skipped: number;
}> {
  const candidates = await listExpiringQuoteCandidates(now);
  if (candidates.length === 0) return { expired: 0, skipped: 0 };

  const keys = candidates.map((q) => buildQuoteExpirationKey(q.id));
  const fired = await listFiredReminderKeysForChannel(keys, "system");

  let expired = 0;
  let skipped = 0;

  for (const quote of candidates) {
    const key = buildQuoteExpirationKey(quote.id);
    if (fired.has(key)) {
      skipped += 1;
      continue;
    }

    const current = await getQuoteById(quote.id);
    if (!current || !EXPIRABLE_STATUSES.includes(current.status)) {
      skipped += 1;
      continue;
    }

    const ok = await expireQuote(current);
    if (!ok) {
      skipped += 1;
      continue;
    }

    await markRemindersFired([
      {
        key,
        itemId: quote.id,
        itemType: "quote",
        title: `Expiration devis ${quote.reference}`,
        triggerAt: now.toISOString(),
        channels: ["system", "in_app"],
      },
    ]);

    expired += 1;
  }

  return { expired, skipped };
}
