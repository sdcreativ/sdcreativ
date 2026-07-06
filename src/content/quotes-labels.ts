export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "follow_up",
  "negotiation",
  "accepted",
  "rejected",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  follow_up: "Relance",
  negotiation: "Négociation",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
};

export const QUOTE_PIPELINE_COLUMNS: { status: QuoteStatus; title: string }[] = [
  { status: "sent", title: "ENVOYÉS" },
  { status: "follow_up", title: "RELANCE" },
  { status: "negotiation", title: "NÉGOCIATION" },
  { status: "accepted", title: "ACCEPTÉS" },
];

export function formatQuoteDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatQuoteAmount(amount: number | null): string {
  if (amount == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} FCFA HT`;
}

export const statusStyles: Record<QuoteStatus, string> = {
  draft: "bg-gray-light text-gray-text",
  sent: "bg-sky-100 text-sky-700",
  follow_up: "bg-amber-100 text-amber-700",
  negotiation: "bg-violet-100 text-violet-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-light text-gray-text",
};
