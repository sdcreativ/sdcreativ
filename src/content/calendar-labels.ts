export const EVENT_TYPES = ["meeting", "call", "reminder", "other"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: "Réunion",
  call: "Appel",
  reminder: "Rappel",
  other: "Autre",
};

export const AUTO_ITEM_TYPES = [
  "project_deadline",
  "task_due",
  "quote_followup",
  "ticket_sla",
] as const;

export type AutoItemType = (typeof AUTO_ITEM_TYPES)[number];

export type CalendarItemType = EventType | AutoItemType;

export const CALENDAR_ITEM_LABELS: Record<CalendarItemType, string> = {
  meeting: "Réunion",
  call: "Appel",
  reminder: "Rappel",
  other: "Autre",
  project_deadline: "Deadline projet",
  task_due: "Échéance tâche",
  quote_followup: "Relance devis",
  ticket_sla: "SLA ticket",
};

export const CALENDAR_ITEM_COLORS: Record<CalendarItemType, string> = {
  meeting: "bg-primary/10 text-primary border border-primary/20",
  call: "bg-violet-500/10 text-violet-700 border border-violet-500/20",
  reminder: "bg-amber-500/10 text-amber-800 border border-amber-500/20",
  other: "bg-gray-light text-gray-text border border-gray/30",
  project_deadline: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
  task_due: "bg-sky-500/10 text-sky-700 border border-sky-500/20",
  quote_followup: "bg-orange-500/10 text-orange-700 border border-orange-500/20",
  ticket_sla: "bg-red-500/10 text-red-700 border border-red-500/20",
};

export const CALENDAR_ITEM_DOT_COLORS: Record<CalendarItemType, string> = {
  meeting: "bg-primary",
  call: "bg-violet-500",
  reminder: "bg-amber-500",
  other: "bg-gray-text",
  project_deadline: "bg-emerald-500",
  task_due: "bg-sky-500",
  quote_followup: "bg-orange-500",
  ticket_sla: "bg-red-500",
};

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export function formatCalendarDateTime(iso: string, allDay?: boolean): string {
  const date = new Date(iso);
  if (allDay) {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateKeyLabel(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" },
): string {
  return new Intl.DateTimeFormat("fr-FR", options).format(parseDateKey(dateKey));
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

export function getMonthGrid(year: number, month: number): Date[] {
  const first = startOfMonth(year, month);
  const startDay = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startDay);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const DAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
