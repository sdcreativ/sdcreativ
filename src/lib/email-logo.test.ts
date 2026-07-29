import { describe, expect, it } from "vitest";
import { toEmailSafeLogoUrl } from "@/lib/email-logo";

describe("toEmailSafeLogoUrl", () => {
  it("remplace le SVG marketing par le PNG", () => {
    expect(toEmailSafeLogoUrl("/images/logo_sd.svg", "https://sdcreativ.com")).toBe(
      "https://sdcreativ.com/images/logo.png",
    );
    expect(
      toEmailSafeLogoUrl("https://sdcreativ.com/images/logo_sd.svg", "https://sdcreativ.com"),
    ).toBe("https://sdcreativ.com/images/logo.png");
  });

  it("conserve un PNG absolu", () => {
    expect(
      toEmailSafeLogoUrl("https://cdn.example.com/brand.png", "https://sdcreativ.com"),
    ).toBe("https://cdn.example.com/brand.png");
  });
});
