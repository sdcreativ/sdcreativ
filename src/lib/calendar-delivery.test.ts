import { describe, expect, it } from "vitest";
import { mapResendEventToInvitationStatus } from "@/lib/resend-webhook";
import { buildRemindersForItems } from "@/lib/calendar-reminders";
import type { CalendarItem } from "@/lib/calendar";

describe("resend webhook mapping", () => {
  it("mappe delivered / bounced / complained", () => {
    expect(mapResendEventToInvitationStatus("email.delivered")).toBe("delivered");
    expect(mapResendEventToInvitationStatus("email.bounced")).toBe("bounced");
    expect(mapResendEventToInvitationStatus("email.complained")).toBe("complained");
    expect(mapResendEventToInvitationStatus("email.sent")).toBeNull();
  });
});

describe("reminder offsets prefs", () => {
  it("respecte les offsets J−1 / H−1 / court", () => {
    const starts = new Date();
    starts.setDate(starts.getDate() + 3);
    starts.setHours(15, 0, 0, 0);

    const item: CalendarItem = {
      id: "event-1",
      title: "Sync",
      description: null,
      type: "meeting",
      source: "event",
      sourceId: "1",
      startsAt: starts.toISOString(),
      endsAt: null,
      allDay: false,
      assignee: null,
      linkHref: null,
    };

    // 10 min avant l’événement → le rappel court (15 min) est dû, pas H−1.
    const now = new Date(starts.getTime() - 10 * 60_000);
    const withShort = buildRemindersForItems([item], now, 20 * 60_000, {
      shortMinutes: 15,
      offsets: { dayBefore: false, hourBefore: false, shortBefore: true },
    });
    expect(withShort.length).toBeGreaterThanOrEqual(1);
    expect(withShort.every((r) => r.offsetTag === "short_before")).toBe(true);

    const none = buildRemindersForItems([item], now, 20 * 60_000, {
      offsets: { dayBefore: false, hourBefore: false, shortBefore: false },
    });
    expect(none).toHaveLength(0);
  });
});
