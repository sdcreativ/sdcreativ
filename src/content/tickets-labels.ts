export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_client",
  "resolved",
  "closed",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_client: "En attente client",
  resolved: "Résolu",
  closed: "Fermé",
};

export const TICKET_PIPELINE_COLUMNS: { status: TicketStatus; title: string }[] = [
  { status: "open", title: "OUVERTS" },
  { status: "in_progress", title: "EN COURS" },
  { status: "waiting_client", title: "ATTENTE CLIENT" },
  { status: "resolved", title: "RÉSOLUS" },
];

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

export const TICKET_CATEGORIES = ["technical", "billing", "project", "other"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: "Technique",
  billing: "Facturation",
  project: "Projet",
  other: "Autre",
};

export const SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 4,
  high: 24,
  normal: 48,
  low: 72,
};

export function formatTicketDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function isSlaBreached(slaDueAt: string | null, status: TicketStatus): boolean {
  if (!slaDueAt || status === "resolved" || status === "closed") return false;
  return new Date(slaDueAt) < new Date();
}

export const priorityStyles: Record<TicketPriority, string> = {
  low: "bg-gray-light text-gray-text",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export const statusStyles: Record<TicketStatus, string> = {
  open: "bg-sky-100 text-sky-700",
  in_progress: "bg-primary-light text-primary",
  waiting_client: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-light text-gray-text",
};

export function computeSlaDueAt(priority: TicketPriority, from = new Date()): Date {
  const due = new Date(from);
  due.setHours(due.getHours() + SLA_HOURS[priority]);
  return due;
}
