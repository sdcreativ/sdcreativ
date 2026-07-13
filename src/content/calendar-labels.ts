export const EVENT_TYPES = ["meeting", "call", "reminder", "other"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const MEETING_PLATFORMS = ["none", "whatsapp", "google_meet", "zoom"] as const;
export type MeetingPlatform = (typeof MEETING_PLATFORMS)[number];

export const MEETING_PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  none: "Sur place / sans visio",
  whatsapp: "WhatsApp",
  google_meet: "Google Meet",
  zoom: "Zoom",
};

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
  meeting: "bg-[#eef4ff] text-[#1e40af] border border-[#bfdbfe]/80",
  call: "bg-[#f5f3ff] text-[#5b21b6] border border-[#ddd6fe]/80",
  reminder: "bg-[#fffbeb] text-[#92400e] border border-[#fde68a]/80",
  other: "bg-slate-50 text-slate-600 border border-slate-200/80",
  project_deadline: "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]/80",
  task_due: "bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]/80",
  quote_followup: "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]/80",
  ticket_sla: "bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]/80",
};

export const CALENDAR_ITEM_DOT_COLORS: Record<CalendarItemType, string> = {
  meeting: "bg-[#2563eb]",
  call: "bg-[#7c3aed]",
  reminder: "bg-[#d97706]",
  other: "bg-slate-400",
  project_deadline: "bg-[#059669]",
  task_due: "bg-[#0284c7]",
  quote_followup: "bg-[#ea580c]",
  ticket_sla: "bg-[#dc2626]",
};

/** Bande latérale agenda / cellules */
export const CALENDAR_ITEM_ACCENT: Record<CalendarItemType, string> = {
  meeting: "bg-[#2563eb]",
  call: "bg-[#7c3aed]",
  reminder: "bg-[#d97706]",
  other: "bg-slate-400",
  project_deadline: "bg-[#059669]",
  task_due: "bg-[#0284c7]",
  quote_followup: "bg-[#ea580c]",
  ticket_sla: "bg-[#dc2626]",
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
