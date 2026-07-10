import { withDb } from "@/lib/db";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { generateInvoiceFromQuote } from "@/lib/billing/generate-invoice";
import { logBillingEvent } from "@/lib/billing/events";
import type { BillingActor } from "@/lib/billing/types";
import { assertQuoteTransition, BillingWorkflowError } from "@/lib/billing/workflow";
import { logCrmAudit } from "@/lib/crm-audit";

export type ValidateQuoteResult = {
  quote: Quote;
  invoiceGenerated: boolean;
  invoice?: { id: string; reference: string };
  emailSent?: boolean;
};

export async function validateQuote(input: {
  quoteId: string;
  actor: BillingActor;
  validatedByUserId?: string | null;
  auditActor?: { userId: string | null; name: string; email: string | null };
  autoGenerateInvoice?: boolean;
  sendInvoiceEmail?: boolean;
}): Promise<ValidateQuoteResult> {
  const quote = await getQuoteById(input.quoteId);
  if (!quote) throw new BillingWorkflowError("Devis introuvable.");

  if (quote.status !== "signed" && quote.status !== "accepted") {
    throw new BillingWorkflowError("Seuls les devis signés peuvent être validés.");
  }

  assertQuoteTransition(quote.status === "accepted" ? "accepted" : "signed", "validated");

  await withDb(async (query) => {
    await query(
      `UPDATE quotes SET
        status = 'validated',
        validated_at = NOW(),
        validated_by = $2,
        updated_at = NOW()
      WHERE id = $1`,
      [quote.id, input.validatedByUserId ?? null],
    );
  });

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.validated",
    actor: input.actor,
    fromStatus: quote.status,
    toStatus: "validated",
    summary: `Devis ${quote.reference} validé par l'administration.`,
  });

  if (input.auditActor) {
    await logCrmAudit({
      actor: input.auditActor,
      action: "quote.validate",
      entityType: "quote",
      entityId: quote.id,
      summary: `Validation du devis ${quote.reference}`,
    });
  }

  const updated = await getQuoteById(quote.id);
  if (!updated) throw new BillingWorkflowError("Devis introuvable.");

  if (input.autoGenerateInvoice === false) {
    return { quote: updated, invoiceGenerated: false };
  }

  const invoiceResult = await generateInvoiceFromQuote({
    quoteId: quote.id,
    actor: input.actor,
    auditActor: input.auditActor,
    sendEmail: input.sendInvoiceEmail !== false,
  });

  return {
    quote: invoiceResult.quote,
    invoiceGenerated: !invoiceResult.alreadyExists,
    invoice: {
      id: invoiceResult.invoice.id,
      reference: invoiceResult.invoice.reference,
    },
    emailSent: invoiceResult.emailSent,
  };
}
