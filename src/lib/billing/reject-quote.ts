import { withDb } from "@/lib/db";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { logBillingEvent } from "@/lib/billing/events";
import { createAdminBillingNotification } from "@/lib/billing/notifications";
import { notifyAdminQuoteRejected } from "@/lib/billing/notify-admin";
import { assertPortalQuoteAccess, PORTAL_SIGNABLE_STATUSES } from "@/lib/billing/portal-access";
import { assertQuoteTransition, BillingWorkflowError } from "@/lib/billing/workflow";

export async function rejectPortalQuote(input: {
  portalClientId: string;
  quoteId: string;
  reason: string;
  actorName?: string;
}): Promise<Quote> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new BillingWorkflowError("Veuillez indiquer un motif de refus (3 caractères minimum).");
  }

  const quote = await assertPortalQuoteAccess(input.portalClientId, input.quoteId);

  if (!PORTAL_SIGNABLE_STATUSES.includes(quote.status)) {
    throw new BillingWorkflowError("Ce devis ne peut plus être refusé.");
  }

  assertQuoteTransition(quote.status, "rejected");

  await withDb(async (query) => {
    await query(
      `UPDATE quotes SET
        status = 'rejected',
        rejection_reason = $2,
        rejected_at = NOW(),
        rejected_by = 'client',
        updated_at = NOW()
      WHERE id = $1`,
      [quote.id, reason],
    );
  });

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.rejected",
    actor: { type: "client", id: input.portalClientId, name: input.actorName ?? quote.name },
    fromStatus: quote.status,
    toStatus: "rejected",
    summary: `Devis ${quote.reference} refusé par le client.`,
    metadata: { reason },
  });

  const updated = await getQuoteById(quote.id);
  if (!updated) throw new BillingWorkflowError("Devis introuvable.");

  void notifyAdminQuoteRejected(updated, reason);
  void createAdminBillingNotification({
    eventType: "quote.rejected",
    title: `Devis refusé — ${updated.reference}`,
    message: `Le client a refusé le devis ${updated.reference}.`,
    linkHref: `/admin/crm/devis?ref=${encodeURIComponent(updated.reference)}`,
    entityType: "quote",
    entityId: updated.id,
  });
  return updated;
}
