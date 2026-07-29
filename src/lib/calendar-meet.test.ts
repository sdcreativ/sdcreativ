import { describe, expect, it } from "vitest";
import { extractMeetUrl } from "@/lib/calendar-meet";

describe("extractMeetUrl", () => {
  it("prefers hangoutLink", () => {
    expect(
      extractMeetUrl({
        hangoutLink: "https://meet.google.com/aaa-bbbb-ccc",
        conferenceData: {
          entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/other" }],
        },
      }),
    ).toBe("https://meet.google.com/aaa-bbbb-ccc");
  });

  it("falls back to video entryPoint", () => {
    expect(
      extractMeetUrl({
        conferenceData: {
          entryPoints: [
            { entryPointType: "phone", uri: "tel:+33" },
            { entryPointType: "video", uri: "https://meet.google.com/xyz-uvwx-yz" },
          ],
        },
      }),
    ).toBe("https://meet.google.com/xyz-uvwx-yz");
  });

  it("returns null when empty", () => {
    expect(extractMeetUrl({})).toBeNull();
  });
});
