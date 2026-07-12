export const CAREER_APPLICATION_STATUSES = [
  "new",
  "screening",
  "interview",
  "hired",
  "rejected",
] as const;

export type CareerApplicationStatus = (typeof CAREER_APPLICATION_STATUSES)[number];

export const CAREER_APPLICATION_STATUS_LABELS: Record<CareerApplicationStatus, string> = {
  new: "Nouveau",
  screening: "Présélection",
  interview: "Entretien",
  hired: "Embauché",
  rejected: "Refusé",
};

export const PO_STATUSES = ["draft", "sent", "accepted", "paid", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  paid: "Payé",
  cancelled: "Annulé",
};

export const API_KEY_SCOPES = [
  "leads:read",
  "leads:write",
  "invoices:read",
  "clients:read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "leads:read": "Lire les leads",
  "leads:write": "Créer des leads",
  "invoices:read": "Lire les factures",
  "clients:read": "Lire les clients",
};
