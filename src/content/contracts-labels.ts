export const CONTRACT_STATUSES = ["draft", "sent", "signed", "linked", "expired", "cancelled"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  signed: "Signé",
  linked: "Lié au projet",
  expired: "Expiré",
  cancelled: "Annulé",
};

export const CONTRACT_PIPELINE_COLUMNS: ContractStatus[] = [
  "draft",
  "sent",
  "signed",
  "linked",
];

export const AMENDMENT_STATUSES = ["draft", "active", "cancelled"] as const;
export type AmendmentStatus = (typeof AMENDMENT_STATUSES)[number];

export const AMENDMENT_STATUS_LABELS: Record<AmendmentStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  cancelled: "Annulé",
};
