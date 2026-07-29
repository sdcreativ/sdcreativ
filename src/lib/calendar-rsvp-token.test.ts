import { describe, expect, it } from "vitest";
import {
  signCalendarRsvpToken,
  verifyCalendarRsvpToken,
} from "@/lib/calendar-rsvp-token";

describe("calendar-rsvp-token", () => {
  it("signe et vérifie un token", () => {
    process.env.ADMIN_SECRET = "test-secret-at-least-16";
    const token = signCalendarRsvpToken("evt-1", "User@Example.com", Date.now() + 60_000);
    const parsed = verifyCalendarRsvpToken(token);
    expect(parsed).toEqual({
      eventId: "evt-1",
      email: "user@example.com",
      expiresAtMs: expect.any(Number),
    });
  });

  it("refuse un token expiré", () => {
    process.env.ADMIN_SECRET = "test-secret-at-least-16";
    const token = signCalendarRsvpToken("evt-1", "a@b.com", Date.now() - 1000);
    expect(verifyCalendarRsvpToken(token)).toBeNull();
  });

  it("refuse une signature altérée", () => {
    process.env.ADMIN_SECRET = "test-secret-at-least-16";
    const token = signCalendarRsvpToken("evt-1", "a@b.com", Date.now() + 60_000);
    const [payload] = token.split(".");
    expect(verifyCalendarRsvpToken(`${payload}.tampered`)).toBeNull();
  });
});
