import { formatMoneyHt, normalizeCurrency, type SupportedCurrency } from "@/lib/currencies";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "follow_up",
  "negotiation",
  "signed",
  "validated",
  "accepted",
  "invoiced",
  "rejected",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  viewed: "Consulté",
  follow_up: "Relance",
  negotiation: "Négociation",
  signed: "Signé — en attente de validation",
  validated: "Validé",
  accepted: "Accepté",
  invoiced: "Facturé",
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

export function formatQuoteAmount(
  amount: number | null,
  currency: string | SupportedCurrency = "XOF",
): string {
  if (amount == null) return "—";
  return formatMoneyHt(amount, normalizeCurrency(currency));
}

export const statusStyles: Record<QuoteStatus, string> = {
  draft: "bg-gray-light text-gray-text",
  sent: "bg-sky-100 text-sky-700",
  viewed: "bg-indigo-100 text-indigo-700",
  follow_up: "bg-amber-100 text-amber-700",
  negotiation: "bg-violet-100 text-violet-700",
  signed: "bg-orange-100 text-orange-800",
  validated: "bg-teal-100 text-teal-800",
  accepted: "bg-emerald-100 text-emerald-700",
  invoiced: "bg-primary/10 text-primary",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-light text-gray-text",
};
