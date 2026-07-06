export const CLIENT_STATUSES = ["active", "prospect", "inactive"] as const;

export const INTERACTION_TYPES = [
  "note",
  "email",
  "call",
  "meeting",
  "whatsapp",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Actif",
  prospect: "Prospect",
  inactive: "Inactif",
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  note: "Note",
  email: "Email",
  call: "Appel",
  meeting: "Réunion",
  whatsapp: "WhatsApp",
};

export const CLIENT_SECTORS = [
  "Technologie",
  "Commerce / Retail",
  "Services",
  "Santé",
  "Immobilier",
  "Éducation",
  "Restauration / Hôtellerie",
  "Finance / Assurance",
  "Industrie",
  "Autre",
] as const;

export type ClientSector = (typeof CLIENT_SECTORS)[number];

export function formatClientRevenue(amount: number): string {
  if (!amount) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function formatClientDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
