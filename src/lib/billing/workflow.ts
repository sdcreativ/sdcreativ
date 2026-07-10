import type { QuoteStatus } from "@/content/quotes-labels";
import { QUOTE_PUBLISHABLE_STATUSES } from "@/lib/billing/types";

const TRANSITIONS: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
  draft: ["sent"],
  sent: ["sent", "viewed", "follow_up", "negotiation", "signed", "rejected", "expired"],
  viewed: ["viewed", "signed", "rejected", "expired", "follow_up", "negotiation"],
  follow_up: ["sent", "viewed", "negotiation", "signed", "rejected", "expired"],
  negotiation: ["sent", "viewed", "signed", "rejected", "expired"],
  signed: ["validated", "rejected"],
  validated: ["invoiced", "rejected"],
  accepted: ["invoiced", "validated"],
  invoiced: [],
  rejected: [],
  expired: [],
};

export class BillingWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingWorkflowError";
  }
}

export function canPublishQuote(status: QuoteStatus): boolean {
  return QUOTE_PUBLISHABLE_STATUSES.includes(status);
}

export function assertQuoteTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (from === to) return;
  const allowed = TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new BillingWorkflowError(
      `Transition devis invalide : ${from} → ${to}.`,
    );
  }
}

export function computeQuoteValidUntil(from = new Date()): Date {
  const validUntil = new Date(from);
  validUntil.setDate(validUntil.getDate() + 30);
  return validUntil;
}
