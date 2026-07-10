export const LEAD_STATUS_LABELS: Record<
  import("@/lib/leads").LeadStatus,
  string
> = {
  new: "Nouveau",
  contacted: "Contacté",
  quote_sent: "Devis envoyé",
  signed: "Signé",
  lost: "Perdu",
};

export const LEAD_SOURCE_LABELS: Record<
  import("@/lib/leads").LeadSource,
  string
> = {
  contact: "Site web — Contact",
  devis: "Devis en ligne",
  presentation_tablet: "Présentation tablette",
  waitlist: "Liste d'attente",
  manual: "Manuel",
  whatsapp: "WhatsApp",
};

export const LEAD_PIPELINE_COLUMNS: Array<{
  status: import("@/lib/leads").LeadStatus;
  title: string;
}> = [
  { status: "new", title: "LEAD" },
  { status: "contacted", title: "CONTACTÉ" },
  { status: "quote_sent", title: "DEVIS ENVOYÉ" },
  { status: "signed", title: "SIGNÉ" },
];

export function formatLeadValue(value: number | null): string {
  if (value === null || value === 0) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export function formatLeadDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
