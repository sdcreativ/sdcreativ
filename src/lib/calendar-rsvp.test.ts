import { describe, expect, it } from "vitest";
import { buildSingleEventIcs } from "@/lib/calendar-ical";
import { summarizeRsvp, type CalendarParticipant } from "@/lib/calendar-participants";

describe("calendar-ical RSVP", () => {
  it("inclut ORGANIZER et ATTENDEE avec PARTSTAT", () => {
    const ics = buildSingleEventIcs({
      id: "evt-42",
      title: "Sync client",
      description: null,
      startsAt: "2026-08-01T10:00:00.000Z",
      endsAt: "2026-08-01T11:00:00.000Z",
      allDay: false,
      meetingUrl: "https://meet.google.com/abc",
      organizerEmail: "contact@sdcreativ.com",
      attendee: {
        email: "guest@example.com",
        name: "Guest",
        status: "pending",
      },
    });

    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("ORGANIZER;CN=SD CREATIV:mailto:contact@sdcreativ.com");
    expect(ics).toContain(
      "ATTENDEE;CN=Guest;RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:guest@example.com",
    );
  });

  it("mappe tentative → PARTSTAT=TENTATIVE", () => {
    const ics = buildSingleEventIcs({
      id: "evt-43",
      title: "Call",
      description: null,
      startsAt: "2026-08-01T10:00:00.000Z",
      endsAt: null,
      allDay: false,
      attendee: { email: "a@b.com", status: "tentative" },
    });
    expect(ics).toContain("PARTSTAT=TENTATIVE");
  });
});

describe("summarizeRsvp", () => {
  it("compte les statuts", () => {
    const participants = [
      { status: "accepted" },
      { status: "accepted" },
      { status: "declined" },
      { status: "tentative" },
      { status: "pending" },
    ] as CalendarParticipant[];

    expect(summarizeRsvp(participants)).toEqual({
      pending: 1,
      accepted: 2,
      declined: 1,
      tentative: 1,
    });
  });
});
