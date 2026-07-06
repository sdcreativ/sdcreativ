export const PROJECT_STATUSES = [
  "discovery",
  "design",
  "development",
  "testing",
  "delivered",
  "on_hold",
  "cancelled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  discovery: "Découverte",
  design: "Design",
  development: "Développement",
  testing: "Tests",
  delivered: "Livré",
  on_hold: "En pause",
  cancelled: "Annulé",
};

export const PROJECT_PIPELINE_COLUMNS: { status: ProjectStatus; title: string }[] = [
  { status: "discovery", title: "DÉCOUVERTE" },
  { status: "design", title: "DESIGN" },
  { status: "development", title: "DÉVELOPPEMENT" },
  { status: "testing", title: "TESTS" },
  { status: "delivered", title: "LIVRÉ" },
];

export const PROJECT_TYPES = [
  "site_vitrine",
  "ecommerce",
  "refonte",
  "application",
  "seo",
  "maintenance",
  "other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  site_vitrine: "Site vitrine",
  ecommerce: "E-commerce",
  refonte: "Refonte web",
  application: "Application",
  seo: "SEO / visibilité",
  maintenance: "Maintenance",
  other: "Autre",
};

export const MILESTONE_STATUSES = ["upcoming", "current", "done"] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  upcoming: "À venir",
  current: "En cours",
  done: "Validé",
};

export const DEFAULT_MILESTONE_LABELS = [
  "Brief validé",
  "Design",
  "Développement",
  "Tests",
  "Mise en ligne",
] as const;

export function formatProjectDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatProjectBudget(amount: number | null): string {
  if (amount == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

export function statusToProgress(status: ProjectStatus): number {
  const map: Record<ProjectStatus, number> = {
    discovery: 10,
    design: 30,
    development: 60,
    testing: 85,
    delivered: 100,
    on_hold: 0,
    cancelled: 0,
  };
  return map[status];
}
