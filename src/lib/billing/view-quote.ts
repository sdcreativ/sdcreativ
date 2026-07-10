import { withDb } from "@/lib/db";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { logBillingEvent } from "@/lib/billing/events";
import { assertPortalQuoteAccess } from "@/lib/billing/portal-access";
import { assertQuoteTransition, BillingWorkflowError } from "@/lib/billing/workflow";
import type { QuoteStatus } from "@/content/quotes-labels";

const VIEWABLE_FROM: QuoteStatus[] = ["sent", "follow_up", "negotiation"];

export async function markQuoteViewed(input: {
  portalClientId: string;
  quoteId: string;
  actorName?: string;
}): Promise<Quote> {
  const quote = await assertPortalQuoteAccess(input.portalClientId, input.quoteId);

  if (quote.status === "viewed" || quote.viewedAt) {
    return quote;
  }

  if (!VIEWABLE_FROM.includes(quote.status)) {
    return quote;
  }

  assertQuoteTransition(quote.status, "viewed");

  await withDb(async (query) => {
    await query(
      `UPDATE quotes SET status = 'viewed', viewed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [quote.id],
    );
  });

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.viewed",
    actor: { type: "client", id: input.portalClientId, name: input.actorName ?? quote.name },
    fromStatus: quote.status,
    toStatus: "viewed",
    summary: `Devis ${quote.reference} consulté par le client.`,
  });

  const updated = await getQuoteById(quote.id);
  if (!updated) throw new BillingWorkflowError("Devis introuvable.");
  return updated;
}
