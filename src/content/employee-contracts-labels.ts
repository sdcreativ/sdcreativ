export const EMPLOYEE_CONTRACT_TYPES = [
  "stage",
  "cdd",
  "cdi",
  "alternance",
  "apprentissage",
  "freelance",
  "prestation",
] as const;

export type EmployeeContractType = (typeof EMPLOYEE_CONTRACT_TYPES)[number];

export const EMPLOYEE_CONTRACT_TYPE_LABELS: Record<EmployeeContractType, string> = {
  stage: "Stage",
  cdd: "CDD",
  cdi: "CDI",
  alternance: "Alternance",
  apprentissage: "Apprentissage",
  freelance: "Freelance",
  prestation: "Prestation",
};

export const EMPLOYEE_CONTRACT_STATUSES = [
  "draft",
  "pending_signature",
  "signed",
  "active",
  "ended",
  "cancelled",
] as const;

export type EmployeeContractStatus = (typeof EMPLOYEE_CONTRACT_STATUSES)[number];

export const EMPLOYEE_CONTRACT_STATUS_LABELS: Record<EmployeeContractStatus, string> = {
  draft: "Brouillon",
  pending_signature: "En signature",
  signed: "Signé",
  active: "Actif",
  ended: "Terminé",
  cancelled: "Annulé",
};

export const EMPLOYEE_CONTRACT_STATUS_STYLES: Record<
  EmployeeContractStatus,
  { bg: string; text: string }
> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700" },
  pending_signature: { bg: "bg-amber-100", text: "text-amber-800" },
  signed: { bg: "bg-sky-100", text: "text-sky-800" },
  active: { bg: "bg-emerald-100", text: "text-emerald-800" },
  ended: { bg: "bg-gray-100", text: "text-gray-600" },
  cancelled: { bg: "bg-rose-100", text: "text-rose-800" },
};

export const EMPLOYEE_COMPENSATION_PERIODS = [
  "hourly",
  "daily",
  "monthly",
  "yearly",
] as const;

export type EmployeeCompensationPeriod = (typeof EMPLOYEE_COMPENSATION_PERIODS)[number];

export const EMPLOYEE_COMPENSATION_PERIOD_LABELS: Record<EmployeeCompensationPeriod, string> = {
  hourly: "Horaire",
  daily: "Journalier",
  monthly: "Mensuel",
  yearly: "Annuel",
};

/** Types à durée déterminée (fin de contrat attendue). */
export const FIXED_TERM_CONTRACT_TYPES: EmployeeContractType[] = [
  "stage",
  "cdd",
  "alternance",
  "apprentissage",
  "prestation",
];
