import { describe, expect, it } from "vitest";
import { EMAIL_CHROME_MARKER, wrapEmailHtml } from "@/lib/email-chrome";
import { DEFAULT_CRM_EMAIL_CHROME, mergeEmailChrome } from "@/lib/crm-settings-types";
import type { EmailChromeCompany } from "@/lib/email-chrome";

const company: EmailChromeCompany = {
  agencyName: "SD CREATIV",
  tagline: "Agence Web",
  primaryColor: "#1e40af",
  logoUrl: "https://sdcreativ.com/images/logo_sd.svg",
  siteUrl: "https://sdcreativ.com",
  phone: "+225 01 02 03 04 05",
  email: "contact@sdcreativ.com",
  address: "Abidjan, Côte d'Ivoire",
  rccm: "CI-ABJ-01",
  ncc: "123456",
};

describe("wrapEmailHtml", () => {
  it("enveloppe le corps avec logo et coordonnées", () => {
    const html = wrapEmailHtml("<p>Bonjour</p>", company);
    expect(html).toContain(EMAIL_CHROME_MARKER);
    expect(html).toContain("logo_sd.svg");
    expect(html).toContain("SD CREATIV");
    expect(html).toContain("Abidjan");
    expect(html).toContain("contact@sdcreativ.com");
    expect(html).toContain("RCCM");
    expect(html).toContain("<p>Bonjour</p>");
  });

  it("ne double pas le chrome", () => {
    const once = wrapEmailHtml("<p>Hi</p>", company);
    const twice = wrapEmailHtml(once, company);
    expect(twice).toBe(once);
  });

  it("respecte enabled=false", () => {
    const html = wrapEmailHtml("<p>Hi</p>", company, { ...DEFAULT_CRM_EMAIL_CHROME, enabled: false });
    expect(html).toBe("<p>Hi</p>");
  });

  it("masque les blocs désactivés", () => {
    const html = wrapEmailHtml("<p>Hi</p>", company, {
      ...DEFAULT_CRM_EMAIL_CHROME,
      showLogo: false,
      showLegal: false,
      showPhone: false,
      footerNote: "Note libre",
    });
    expect(html).not.toContain("logo_sd.svg");
    expect(html).not.toContain("RCCM");
    expect(html).not.toContain("tel:");
    expect(html).toContain("Note libre");
  });
});

describe("mergeEmailChrome", () => {
  it("fusionne avec les défauts", () => {
    expect(mergeEmailChrome({ showLogo: false }).showLogo).toBe(false);
    expect(mergeEmailChrome({ showLogo: false }).enabled).toBe(true);
    expect(mergeEmailChrome(null).footerNote).toBe("");
  });
});
