import type { CalendarItemType } from "@/content/calendar-labels";
import { parseDateKey, toDateKey } from "@/content/calendar-labels";
import type { CalendarItem } from "@/lib/calendar";

export type ReminderOffsetTag = "day_before" | "hour_before" | "short_before" | "other";

export type ReminderRule =
  | { kind: "minutes_before"; minutes: number; tag?: ReminderOffsetTag }
  | { kind: "at_time"; hour: number; minute: number; dayOffset: number; tag?: ReminderOffsetTag };

/** Règles de déclenchement par type d'événement (minutes avant ou heure fixe). */
export const CALENDAR_REMINDER_RULES: Record<CalendarItemType, ReminderRule[]> = {
  meeting: [
    { kind: "at_time", hour: 9, minute: 0, dayOffset: -1, tag: "day_before" },
    { kind: "minutes_before", minutes: 60, tag: "hour_before" },
    { kind: "minutes_before", minutes: 15, tag: "short_before" },
  ],
  call: [
    { kind: "at_time", hour: 9, minute: 0, dayOffset: -1, tag: "day_before" },
    { kind: "minutes_before", minutes: 60, tag: "hour_before" },
    { kind: "minutes_before", minutes: 10, tag: "short_before" },
  ],
  reminder: [{ kind: "minutes_before", minutes: 0, tag: "short_before" }],
  other: [
    { kind: "at_time", hour: 9, minute: 0, dayOffset: -1, tag: "day_before" },
    { kind: "minutes_before", minutes: 60, tag: "hour_before" },
    { kind: "minutes_before", minutes: 30, tag: "short_before" },
  ],
  project_deadline: [
    { kind: "at_time", hour: 9, minute: 0, dayOffset: -1, tag: "day_before" },
    { kind: "at_time", hour: 9, minute: 0, dayOffset: 0, tag: "other" },
  ],
  task_due: [
    { kind: "at_time", hour: 17, minute: 0, dayOffset: -1, tag: "day_before" },
    { kind: "at_time", hour: 8, minute: 0, dayOffset: 0, tag: "other" },
  ],
  quote_followup: [
    { kind: "minutes_before", minutes: 60, tag: "hour_before" },
    { kind: "minutes_before", minutes: 15, tag: "short_before" },
  ],
  ticket_sla: [
    { kind: "minutes_before", minutes: 120, tag: "other" },
    { kind: "minutes_before", minutes: 30, tag: "short_before" },
  ],
};

export const CALENDAR_REMINDER_LABELS: Record<CalendarItemType, string> = {
  meeting: "Réunion — veille 9 h, 1 h et rappel court avant",
  call: "Appel — veille 9 h, 1 h et rappel court avant",
  reminder: "Rappel — à l'heure prévue",
  other: "Événement — veille 9 h, 1 h et rappel court avant",
  project_deadline: "Deadline — veille et jour J à 9 h",
  task_due: "Tâche — veille 17 h et jour J à 8 h",
  quote_followup: "Devis — rappels 1 h et 15 min avant",
  ticket_sla: "SLA ticket — rappels 2 h et 30 min avant",
};

export type CalendarReminderOffsets = {
  dayBefore: boolean;
  hourBefore: boolean;
  shortBefore: boolean;
};

export type BuildRemindersOptions = {
  /** Remplace la durée du rappel « court » (meeting/call/other). */
  shortMinutes?: number;
  offsets?: Partial<CalendarReminderOffsets>;
};

export type CalendarReminder = {
  key: string;
  itemId: string;
  itemType: CalendarItemType;
  title: string;
  description: string | null;
  attachmentNames: string[];
  triggerAt: string;
  eventStartsAt: string;
  urgency: "high" | "normal";
  linkHref: string | null;
  leadMinutes: number | null;
  offsetTag: ReminderOffsetTag;
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

function isOffsetEnabled(
  tag: ReminderOffsetTag,
  offsets?: Partial<CalendarReminderOffsets>,
): boolean {
  if (!offsets) return true;
  if (tag === "day_before") return offsets.dayBefore !== false;
  if (tag === "hour_before") return offsets.hourBefore !== false;
  if (tag === "short_before") return offsets.shortBefore !== false;
  return true;
}

export function computeReminderTriggers(
  item: CalendarItem,
  options?: BuildRemindersOptions,
): Array<{
  triggerAt: Date;
  leadMinutes: number | null;
  offsetTag: ReminderOffsetTag;
}> {
  const rules = CALENDAR_REMINDER_RULES[item.type];
  const eventStart = new Date(item.startsAt);
  const eventDay = toDateKey(eventStart);
  const triggers: Array<{
    triggerAt: Date;
    leadMinutes: number | null;
    offsetTag: ReminderOffsetTag;
  }> = [];

  for (const rule of rules) {
    const tag = rule.tag ?? "other";
    if (!isOffsetEnabled(tag, options?.offsets)) continue;

    if (rule.kind === "minutes_before") {
      let minutes = rule.minutes;
      if (tag === "short_before" && options?.shortMinutes != null) {
        minutes = options.shortMinutes;
      }
      if (item.allDay) {
        if (minutes === 0) {
          triggers.push({
            triggerAt: localDateTime(eventDay, 9, 0),
            leadMinutes: 0,
            offsetTag: tag,
          });
        }
        continue;
      }
      triggers.push({
        triggerAt: new Date(eventStart.getTime() - minutes * 60_000),
        leadMinutes: minutes,
        offsetTag: tag,
      });
    } else {
      const base = parseDateKey(eventDay);
      base.setDate(base.getDate() + rule.dayOffset);
      base.setHours(rule.hour, rule.minute, 0, 0);
      const leadMinutes = Math.round((eventStart.getTime() - base.getTime()) / 60_000);
      triggers.push({
        triggerAt: base,
        leadMinutes: leadMinutes > 0 ? leadMinutes : null,
        offsetTag: tag,
      });
    }
  }

  return triggers;
}

export function buildRemindersForItems(
  items: CalendarItem[],
  now: Date,
  graceMs: number,
  options?: BuildRemindersOptions,
): CalendarReminder[] {
  const results: CalendarReminder[] = [];
  const windowStart = now.getTime() - graceMs;

  for (const item of items) {
    const eventStart = new Date(item.startsAt);
    if (eventStart.getTime() < windowStart - 86_400_000) continue;

    for (const { triggerAt, leadMinutes, offsetTag } of computeReminderTriggers(item, options)) {
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
        attachmentNames: item.attachmentNames ?? [],
        triggerAt: triggerAt.toISOString(),
        eventStartsAt: item.startsAt,
        urgency,
        linkHref: item.linkHref ?? "/admin/crm/calendrier",
        leadMinutes: lead,
        offsetTag,
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
