import { describe, expect, it } from "vitest";
import { resolveCalendarNotifyEmail } from "@/lib/calendar-notify-email";

describe("resolveCalendarNotifyEmail", () => {
  it("préfère l'email personnel", () => {
    expect(
      resolveCalendarNotifyEmail({
        professionalEmail: "paterne@sdcreativ.com",
        personalEmail: "paterne.perso@gmail.com",
      }),
    ).toBe("paterne.perso@gmail.com");
  });

  it("retombe sur l'email professionnel si perso absent", () => {
    expect(
      resolveCalendarNotifyEmail({
        professionalEmail: "paterne@sdcreativ.com",
        personalEmail: null,
      }),
    ).toBe("paterne@sdcreativ.com");
  });

  it("ignore un perso invalide", () => {
    expect(
      resolveCalendarNotifyEmail({
        professionalEmail: "paterne@sdcreativ.com",
        personalEmail: "   ",
      }),
    ).toBe("paterne@sdcreativ.com");
  });
});
