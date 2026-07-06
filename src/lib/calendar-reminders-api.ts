import type { CalendarReminder } from "@/lib/calendar-reminders";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export type CalendarReminderPayload = {
  reminders: CalendarReminder[];
  upcoming: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    linkHref: string;
  }>;
};

export async function fetchCalendarReminders(): Promise<CalendarReminderPayload> {
  const res = await fetch("/api/admin/calendar/reminders", { credentials: "include" });
  return parseJson<CalendarReminderPayload>(res);
}

export async function acknowledgeCalendarReminders(
  reminders: Array<{
    key: string;
    itemId: string;
    itemType: string;
    title: string;
    triggerAt: string;
    channels?: string[];
  }>,
): Promise<void> {
  const res = await fetch("/api/admin/calendar/reminders", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reminders }),
  });
  await parseJson<{ success: boolean }>(res);
}
