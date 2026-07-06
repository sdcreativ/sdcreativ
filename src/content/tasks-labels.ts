import { CRM_TEAM_MEMBERS } from "@/content/crm-team";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

export const TASK_PIPELINE_COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "À FAIRE" },
  { status: "in_progress", title: "EN COURS" },
  { status: "done", title: "TERMINÉ" },
];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Basse",
  medium: "Normale",
  high: "Haute",
};

export const TASK_ASSIGNEES = CRM_TEAM_MEMBERS;

export function formatTaskDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function isTaskOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === "done") return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-gray-light text-gray-text",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-red-100 text-red-700",
};

export const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-amber-100 text-amber-700",
  in_progress: "bg-primary-light text-primary",
  done: "bg-emerald-100 text-emerald-700",
};
