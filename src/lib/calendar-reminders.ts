import type { CalendarItemType } from "@/content/calendar-labels";
import { parseDateKey, toDateKey } from "@/content/calendar-labels";
import type { CalendarItem } from "@/lib/calendar";

export type ReminderRule =
  | { kind: "minutes_before"; minutes: number }
  | { kind: "at_time"; hour: number; minute: number; dayOffset: number };

/** Règles de déclenchement par type d'événement (minutes avant ou heure fixe). */
export const CALENDAR_REMINDER_RULES: Record<CalendarItemType, ReminderRule[]> = {
  meeting: [{ kind: "minutes_before", minutes: 15 }],
  call: [{ kind: "minutes_before", minutes: 10 }],
  reminder: [{ kind: "minutes_before", minutes: 0 }],
  other: [{ kind: "minutes_before", minutes: 30 }],
  project_deadline: [
    { kind: "at_time", hour: 9, minute: 0, dayOffset: -1 },
    { kind: "at_time", hour: 9, minute: 0, dayOffset: 0 },
  ],
  task_due: [
    { kind: "at_time", hour: 17, minute: 0, dayOffset: -1 },
    { kind: "at_time", hour: 8, minute: 0, dayOffset: 0 },
  ],
  quote_followup: [
    { kind: "minutes_before", minutes: 60 },
    { kind: "minutes_before", minutes: 15 },
  ],
  ticket_sla: [
    { kind: "minutes_before", minutes: 120 },
    { kind: "minutes_before", minutes: 30 },
  ],
};

export const CALENDAR_REMINDER_LABELS: Record<CalendarItemType, string> = {
  meeting: "Réunion — rappel 15 min avant",
  call: "Appel — rappel 10 min avant",
  reminder: "Rappel — à l'heure prévue",
  other: "Événement — rappel 30 min avant",
  project_deadline: "Deadline — veille et jour J à 9 h",
  task_due: "Tâche — veille 17 h et jour J à 8 h",
  quote_followup: "Devis — rappels 1 h et 15 min avant",
  ticket_sla: "SLA ticket — rappels 2 h et 30 min avant",
};

export type CalendarReminder = {
  key: string;
  itemId: string;
  itemType: CalendarItemType;
  title: string;
  description: string | null;
  triggerAt: string;
  eventStartsAt: string;
  urgency: "high" | "normal";
  linkHref: string | null;
  leadMinutes: number | null;
  message: string;
};

function localDateTime(dateKey: string, hour: number, minute: number): Date {
  const base = parseDateKey(dateKey);
  base.setHours(hour, minute, 0, 0);
  return base;
}

function formatLeadLabel(minutes: number): string {
  if (minutes === 0) return "Maintenant";
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} j avant`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h avant`;
  return `${minutes} min avant`;
}

export function computeReminderTriggers(item: CalendarItem): Array<{
  triggerAt: Date;
  leadMinutes: number | null;
}> {
  const rules = CALENDAR_REMINDER_RULES[item.type];
  const eventStart = new Date(item.startsAt);
  const eventDay = toDateKey(eventStart);
  const triggers: Array<{ triggerAt: Date; leadMinutes: number | null }> = [];

  for (const rule of rules) {
    if (rule.kind === "minutes_before") {
      if (item.allDay) {
        if (rule.minutes === 0) {
          triggers.push({ triggerAt: localDateTime(eventDay, 9, 0), leadMinutes: 0 });
        }
        continue;
      }
      triggers.push({
        triggerAt: new Date(eventStart.getTime() - rule.minutes * 60_000),
        leadMinutes: rule.minutes,
      });
    } else {
      const base = parseDateKey(eventDay);
      base.setDate(base.getDate() + rule.dayOffset);
      base.setHours(rule.hour, rule.minute, 0, 0);
      const leadMinutes = Math.round((eventStart.getTime() - base.getTime()) / 60_000);
      triggers.push({ triggerAt: base, leadMinutes: leadMinutes > 0 ? leadMinutes : null });
    }
  }

  return triggers;
}

export function buildRemindersForItems(
  items: CalendarItem[],
  now: Date,
  graceMs: number,
): CalendarReminder[] {
  const results: CalendarReminder[] = [];
  const windowStart = now.getTime() - graceMs;

  for (const item of items) {
    const eventStart = new Date(item.startsAt);
    if (eventStart.getTime() < windowStart - 86_400_000) continue;

    for (const { triggerAt, leadMinutes } of computeReminderTriggers(item)) {
      const t = triggerAt.getTime();
      if (t > now.getTime() || t < windowStart) continue;

      const key = `${item.id}:${triggerAt.toISOString()}`;
      const lead = leadMinutes ?? Math.max(0, Math.round((eventStart.getTime() - t) / 60_000));
      const urgency = lead <= 15 ? "high" : "normal";

      results.push({
        key,
        itemId: item.id,
        itemType: item.type,
        title: item.title,
        description: item.description,
        triggerAt: triggerAt.toISOString(),
        eventStartsAt: item.startsAt,
        urgency,
        linkHref: item.linkHref ?? "/admin/crm/calendrier",
        leadMinutes: lead,
        message: `${formatLeadLabel(lead)} — ${item.title}`,
      });
    }
  }

  return results.sort((a, b) => a.triggerAt.localeCompare(b.triggerAt));
}

export function getUpcomingItems(items: CalendarItem[], withinMinutes: number, now = new Date()) {
  const limit = now.getTime() + withinMinutes * 60_000;
  return items.filter((item) => {
    const start = new Date(item.startsAt).getTime();
    return start >= now.getTime() && start <= limit;
  });
}

/** Libellé « dans X min » pour un événement imminent (null si > 24 h ou passé). */
export function formatCountdownToEvent(startsAt: string, now = new Date()): string | null {
  const diff = new Date(startsAt).getTime() - now.getTime();
  if (diff <= 0 || diff > 86_400_000) return null;
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `dans ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `dans ${hours} h ${rem} min` : `dans ${hours} h`;
}
