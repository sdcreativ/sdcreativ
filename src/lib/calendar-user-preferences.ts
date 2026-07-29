import { z } from "zod";
import type { CalendarItemType } from "@/content/calendar-labels";
import { resolveCalendarNotifyEmail } from "@/lib/calendar-notify-email";
import { withDb } from "@/lib/db";

export type CalendarTypeReminderPrefs = {
  email: boolean;
  sms: boolean;
};

export type CalendarReminderPreferences = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  smsPhone: string | null;
  /** Minutes avant l'événement pour le rappel « court » (meeting/call/other). */
  defaultLeadMinutes: number;
  /** Quels créneaux déclencher (J−1 / H−1 / rappel court). */
  offsets: {
    dayBefore: boolean;
    hourBefore: boolean;
    shortBefore: boolean;
  };
  types: Partial<Record<CalendarItemType, CalendarTypeReminderPrefs>>;
};

export const DEFAULT_CALENDAR_REMINDER_PREFERENCES: CalendarReminderPreferences = {
  emailEnabled: true,
  smsEnabled: false,
  smsPhone: null,
  defaultLeadMinutes: 15,
  offsets: {
    dayBefore: true,
    hourBefore: true,
    shortBefore: true,
  },
  types: {},
};

export const updateCalendarReminderPrefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  smsPhone: z.string().trim().max(30).nullable().optional(),
  defaultLeadMinutes: z.number().int().min(0).max(1440).optional(),
  offsets: z
    .object({
      dayBefore: z.boolean().optional(),
      hourBefore: z.boolean().optional(),
      shortBefore: z.boolean().optional(),
    })
    .optional(),
  types: z.record(
    z.string(),
    z.object({ email: z.boolean(), sms: z.boolean() }),
  ).optional(),
});

function parsePreferences(raw: Record<string, unknown> | null): CalendarReminderPreferences {
  const cal = raw?.calendarReminders;
  if (!cal || typeof cal !== "object") return { ...DEFAULT_CALENDAR_REMINDER_PREFERENCES, offsets: { ...DEFAULT_CALENDAR_REMINDER_PREFERENCES.offsets } };
  const obj = cal as Partial<CalendarReminderPreferences>;
  return {
    emailEnabled: obj.emailEnabled ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.emailEnabled,
    smsEnabled: obj.smsEnabled ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.smsEnabled,
    smsPhone: obj.smsPhone ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.smsPhone,
    defaultLeadMinutes: obj.defaultLeadMinutes ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.defaultLeadMinutes,
    offsets: {
      dayBefore: obj.offsets?.dayBefore ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.offsets.dayBefore,
      hourBefore: obj.offsets?.hourBefore ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.offsets.hourBefore,
      shortBefore: obj.offsets?.shortBefore ?? DEFAULT_CALENDAR_REMINDER_PREFERENCES.offsets.shortBefore,
    },
    types: obj.types ?? {},
  };
}

export async function getCalendarReminderPreferences(
  userId: string,
): Promise<CalendarReminderPreferences> {
  return withDb(async (query) => {
    const { rows } = await query<{ preferences: Record<string, unknown> | null }>(
      `SELECT preferences FROM crm_users WHERE id = $1`,
      [userId],
    );
    return parsePreferences(rows[0]?.preferences ?? null);
  });
}

export async function updateCalendarReminderPreferences(
  userId: string,
  input: z.infer<typeof updateCalendarReminderPrefsSchema>,
): Promise<CalendarReminderPreferences> {
  return withDb(async (query) => {
    const { rows } = await query<{ preferences: Record<string, unknown> | null }>(
      `SELECT preferences FROM crm_users WHERE id = $1`,
      [userId],
    );
    const existing = rows[0]?.preferences ?? {};
    const current = parsePreferences(existing);
    const next: CalendarReminderPreferences = {
      emailEnabled: input.emailEnabled ?? current.emailEnabled,
      smsEnabled: input.smsEnabled ?? current.smsEnabled,
      smsPhone: input.smsPhone !== undefined ? input.smsPhone : current.smsPhone,
      defaultLeadMinutes: input.defaultLeadMinutes ?? current.defaultLeadMinutes,
      offsets: {
        dayBefore: input.offsets?.dayBefore ?? current.offsets.dayBefore,
        hourBefore: input.offsets?.hourBefore ?? current.offsets.hourBefore,
        shortBefore: input.offsets?.shortBefore ?? current.offsets.shortBefore,
      },
      types: input.types ? { ...current.types, ...input.types } : current.types,
    };

    await query(
      `UPDATE crm_users SET preferences = $2, updated_at = NOW() WHERE id = $1`,
      [userId, JSON.stringify({ ...existing, calendarReminders: next })],
    );

    return next;
  });
}

export async function listUsersWithCalendarEmailEnabled(): Promise<
  Array<{ id: string; name: string; email: string; preferences: CalendarReminderPreferences }>
> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      name: string;
      email: string;
      personal_email: string | null;
      preferences: Record<string, unknown> | null;
    }>(
      `SELECT id, name, email, personal_email, preferences FROM crm_users WHERE active = true`,
    );

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: resolveCalendarNotifyEmail({
          professionalEmail: row.email,
          personalEmail: row.personal_email,
        }),
        preferences: parsePreferences(row.preferences),
      }))
      .filter((u) => u.preferences.emailEnabled);
  });
}

export function shouldSendEmailReminder(
  prefs: CalendarReminderPreferences,
  itemType: CalendarItemType,
): boolean {
  if (!prefs.emailEnabled) return false;
  const typePrefs = prefs.types[itemType];
  if (typePrefs && typePrefs.email === false) return false;
  return true;
}

export function shouldSendSmsReminder(
  prefs: CalendarReminderPreferences,
  itemType: CalendarItemType,
): boolean {
  if (!prefs.smsEnabled || !prefs.smsPhone?.trim()) return false;
  const typePrefs = prefs.types[itemType];
  if (typePrefs && typePrefs.sms === false) return false;
  return true;
}

export async function listUsersWithCalendarSmsEnabled(): Promise<
  Array<{ id: string; name: string; email: string; phone: string; preferences: CalendarReminderPreferences }>
> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      name: string;
      email: string;
      preferences: Record<string, unknown> | null;
    }>(`SELECT id, name, email, preferences FROM crm_users WHERE active = true`);

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        preferences: parsePreferences(row.preferences),
      }))
      .filter((u) => u.preferences.smsEnabled && u.preferences.smsPhone?.trim())
      .map((u) => ({
        ...u,
        phone: u.preferences.smsPhone!.trim(),
      }));
  });
}
