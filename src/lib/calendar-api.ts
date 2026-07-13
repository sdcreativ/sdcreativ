import { parseDateKey } from "@/content/calendar-labels";
import type { CalendarEvent, CalendarItem } from "@/lib/calendar";
import type { CalendarParticipant } from "@/lib/calendar-participants";
import type { CalendarReminderPreferences } from "@/lib/calendar-user-preferences";
import type { CalendarOAuthProvider } from "@/lib/calendar-oauth-config";
import type { CalendarOAuthConnection } from "@/lib/calendar-oauth";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchCalendarItems(year: number, month: number): Promise<CalendarItem[]> {
  const res = await fetch(`/api/admin/calendar?year=${year}&month=${month}`, {
    credentials: "include",
  });
  const json = await parseJson<{ items: CalendarItem[] }>(res);
  return json.items;
}

export async function fetchCalendarItemsRange(from: string, to: string): Promise<CalendarItem[]> {
  const res = await fetch(
    `/api/admin/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { credentials: "include" },
  );
  const json = await parseJson<{ items: CalendarItem[] }>(res);
  return json.items;
}

export async function fetchCalendarReminderPreferences(): Promise<{
  preferences: CalendarReminderPreferences;
  twilioConfigured: boolean;
}> {
  const res = await fetch("/api/admin/calendar/preferences", { credentials: "include" });
  const json = await parseJson<{ preferences: CalendarReminderPreferences; twilioConfigured?: boolean }>(res);
  return {
    preferences: json.preferences,
    twilioConfigured: json.twilioConfigured ?? false,
  };
}

export async function updateCalendarReminderPreferencesApi(
  input: Partial<CalendarReminderPreferences>,
): Promise<CalendarReminderPreferences> {
  const res = await fetch("/api/admin/calendar/preferences", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ preferences: CalendarReminderPreferences }>(res);
  return json.preferences;
}

import type { CalendarInvitee } from "@/lib/calendar-invitees-types";

export async function fetchCalendarInvitees(): Promise<CalendarInvitee[]> {
  const res = await fetch("/api/admin/calendar/invitees", { credentials: "include" });
  const json = await parseJson<{ invitees: CalendarInvitee[] }>(res);
  return json.invitees;
}

export async function fetchEventParticipants(eventId: string): Promise<CalendarParticipant[]> {
  const res = await fetch(`/api/admin/calendar/events/${eventId}/participants`, {
    credentials: "include",
  });
  const json = await parseJson<{ participants: CalendarParticipant[] }>(res);
  return json.participants;
}

export async function createCalendarEventApi(
  input: Record<string, unknown>,
): Promise<CalendarEvent> {
  const res = await fetch("/api/admin/calendar/events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ event: CalendarEvent }>(res);
  return json.event;
}

export async function updateCalendarEventApi(
  id: string,
  input: Record<string, unknown>,
): Promise<CalendarEvent> {
  const res = await fetch(`/api/admin/calendar/events/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ event: CalendarEvent }>(res);
  return json.event;
}

export async function deleteCalendarEventApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/calendar/events/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function moveCalendarEventApi(
  sourceId: string,
  newDateKey: string,
  hour?: number,
  allDay = true,
): Promise<CalendarEvent> {
  const startsAt = allDay
    ? newDateKey
    : (() => {
        const d = parseDateKey(newDateKey);
        if (hour !== undefined) d.setHours(hour, 0, 0, 0);
        return d.toISOString();
      })();

  return updateCalendarEventApi(sourceId, { startsAt, allDay });
}

export async function fetchCalendarOAuthStatus(): Promise<{
  connections: CalendarOAuthConnection[];
  providers: Record<CalendarOAuthProvider, { configured: boolean; connected: boolean }>;
  requiresCrmAccount: boolean;
}> {
  const res = await fetch("/api/admin/calendar/oauth/status", { credentials: "include" });
  return parseJson(res);
}

export async function triggerCalendarOAuthSync(provider?: CalendarOAuthProvider): Promise<{
  created: number;
  updated: number;
}> {
  const res = await fetch("/api/admin/calendar/oauth/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(provider ? { provider } : {}),
  });
  return parseJson(res);
}

export async function disconnectCalendarOAuth(provider: CalendarOAuthProvider): Promise<void> {
  const res = await fetch(`/api/admin/calendar/oauth/${provider}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}
