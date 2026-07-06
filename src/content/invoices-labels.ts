export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export const INVOICE_PIPELINE_COLUMNS: Array<{ status: InvoiceStatus; title: string }> = [
  { status: "draft", title: "BROUILLONS" },
  { status: "sent", title: "ENVOYÉES" },
  { status: "paid", title: "PAYÉES" },
  { status: "overdue", title: "EN RETARD" },
];

export const statusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-light text-gray-text",
  sent: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-accent/10 text-accent",
  cancelled: "bg-red-100 text-red-700",
};

export function formatInvoiceAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("XOF", "FCFA");
}

export function formatInvoiceDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
