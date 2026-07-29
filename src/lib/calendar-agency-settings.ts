import { z } from "zod";
import { withDb } from "@/lib/db";

export type CalendarAgencySettings = {
  /** crm_users.id dont le Google OAuth sert de compte Meet agence. */
  meetAgencyUserId: string | null;
  /** crm_users.id dont le Microsoft OAuth sert de compte Teams agence. */
  teamsAgencyUserId: string | null;
};

export const DEFAULT_CALENDAR_AGENCY_SETTINGS: CalendarAgencySettings = {
  meetAgencyUserId: null,
  teamsAgencyUserId: null,
};

export const updateCalendarAgencySettingsSchema = z.object({
  meetAgencyUserId: z.string().uuid().nullable().optional(),
  teamsAgencyUserId: z.string().uuid().nullable().optional(),
});

export function mergeCalendarAgencySettings(
  stored: Partial<CalendarAgencySettings> | null | undefined,
): CalendarAgencySettings {
  return {
    meetAgencyUserId:
      typeof stored?.meetAgencyUserId === "string" ? stored.meetAgencyUserId : null,
    teamsAgencyUserId:
      typeof stored?.teamsAgencyUserId === "string" ? stored.teamsAgencyUserId : null,
  };
}

let ensuredCalendarSettingsColumn = false;

async function ensureCalendarSettingsColumn(): Promise<void> {
  if (ensuredCalendarSettingsColumn) return;
  await withDb(async (query) => {
    await query(`
      ALTER TABLE crm_settings
        ADD COLUMN IF NOT EXISTS calendar_settings JSONB NOT NULL DEFAULT '{}'::jsonb
    `);
  });
  ensuredCalendarSettingsColumn = true;
}

export async function getCalendarAgencySettings(): Promise<CalendarAgencySettings> {
  await ensureCalendarSettingsColumn();
  return withDb(async (query) => {
    const { rows } = await query<{ calendar_settings: CalendarAgencySettings | null }>(
      `SELECT calendar_settings FROM crm_settings WHERE id = 1`,
    );
    return mergeCalendarAgencySettings(rows[0]?.calendar_settings);
  });
}

export async function updateCalendarAgencySettings(
  input: z.infer<typeof updateCalendarAgencySettingsSchema>,
): Promise<CalendarAgencySettings> {
  await ensureCalendarSettingsColumn();
  return withDb(async (query) => {
    const current = await getCalendarAgencySettings();
    const next: CalendarAgencySettings = {
      meetAgencyUserId:
        input.meetAgencyUserId !== undefined
          ? input.meetAgencyUserId
          : current.meetAgencyUserId,
      teamsAgencyUserId:
        input.teamsAgencyUserId !== undefined
          ? input.teamsAgencyUserId
          : current.teamsAgencyUserId,
    };
    await query(
      `INSERT INTO crm_settings (id, calendar_settings, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET calendar_settings = $1, updated_at = NOW()`,
      [JSON.stringify(next)],
    );
    return next;
  });
}
