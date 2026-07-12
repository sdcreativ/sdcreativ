export const CREDIT_NOTE_STATUSES = ["draft", "issued", "applied", "cancelled"] as const;
export type CreditNoteStatus = (typeof CREDIT_NOTE_STATUSES)[number];

export const CREDIT_NOTE_STATUS_LABELS: Record<CreditNoteStatus, string> = {
  draft: "Brouillon",
  issued: "Émis",
  applied: "Appliqué",
  cancelled: "Annulé",
};

export function formatCreditNoteAmount(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(cents);
}
