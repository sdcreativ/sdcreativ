import { describe, expect, it } from "vitest";
import {
  createSitePopupSchema,
  DEFAULT_SITE_POPUP,
  generatePopupCode,
  POPUP_CODE_PATTERN,
  popupAllowedByFrequency,
  popupMatchesAudience,
  popupMatchesPath,
  popupSignupSchema,
  updateSitePopupSchema,
} from "@/lib/site-popups-types";
import { createDevisSchema } from "@/lib/validations/devis";
import { defaultSiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import { timelineOptions } from "@/content/contact-options";

describe("ciblage des pages", () => {
  const popup = { includePaths: [] as string[], excludePaths: ["/devis", "/contact"] };

  it("toutes les pages publiques par défaut, sauf exclusions", () => {
    expect(popupMatchesPath(popup, "/")).toBe(true);
    expect(popupMatchesPath(popup, "/tarifs")).toBe(true);
    expect(popupMatchesPath(popup, "/devis")).toBe(false);
    expect(popupMatchesPath(popup, "/contact/merci")).toBe(false);
  });

  it("jamais sur les espaces privés, même sans exclusion", () => {
    const open = { includePaths: [], excludePaths: [] };
    for (const path of ["/admin/crm", "/espace-client", "/presentation/x", "/c/carte"]) {
      expect(popupMatchesPath(open, path)).toBe(false);
    }
  });

  it("inclusion par préfixe exact (/tarifs ≠ /tarifs-pro)", () => {
    const only = { includePaths: ["/tarifs"], excludePaths: [] };
    expect(popupMatchesPath(only, "/tarifs")).toBe(true);
    expect(popupMatchesPath(only, "/tarifs/essentiel")).toBe(true);
    expect(popupMatchesPath(only, "/tarifs-pro")).toBe(false);
    expect(popupMatchesPath(only, "/")).toBe(false);
    expect(popupMatchesPath({ includePaths: ["/"], excludePaths: [] }, "/tarifs")).toBe(false);
  });
});

describe("audience et fréquence", () => {
  it("nouveaux / visiteurs qui reviennent / tous", () => {
    expect(popupMatchesAudience("new", 1)).toBe(true);
    expect(popupMatchesAudience("new", 2)).toBe(false);
    expect(popupMatchesAudience("returning", 1)).toBe(false);
    expect(popupMatchesAudience("returning", 3)).toBe(true);
    expect(popupMatchesAudience("all", 5)).toBe(true);
  });

  it("jamais après inscription, sinon une fois tous les N jours", () => {
    const day = 86_400_000;
    const now = 100 * day;
    expect(popupAllowedByFrequency(null, 14, now)).toBe(true);
    expect(popupAllowedByFrequency({ signedUp: true }, 0, now)).toBe(false);
    expect(popupAllowedByFrequency({ lastShownAt: now - 13 * day }, 14, now)).toBe(false);
    expect(popupAllowedByFrequency({ lastShownAt: now - 14 * day }, 14, now)).toBe(true);
  });
});

describe("code personnel", () => {
  it("PRÉFIXE-PRÉNOM-XXXX, sans accents ni caractères ambigus", () => {
    const code = generatePopupCode("SDC", "Awa Koné", new Uint8Array([0, 1, 2, 3]));
    expect(code).toBe("SDC-AWA-ABCD");
    expect(code).toMatch(POPUP_CODE_PATTERN);
    expect(generatePopupCode("SDC", "Éloïse", new Uint8Array([30, 29, 28, 27]))).toBe("SDC-ELO-9876");
    expect(generatePopupCode("SDC", "42", new Uint8Array([5, 5, 5, 5]))).toBe("SDC-WEB-FFFF");
    expect(generatePopupCode("SDC", "x", new Uint8Array([200, 201, 202, 203]))).not.toMatch(/[01ILO]$/);
  });
});

describe("validation", () => {
  it("le consentement est obligatoire", () => {
    const base = { name: "Awa", email: "awa@example.com" };
    expect(popupSignupSchema.safeParse(base).success).toBe(false);
    expect(popupSignupSchema.safeParse({ ...base, consent: true }).success).toBe(true);
  });

  it("téléphone vide toléré, type de projet limité à la liste", () => {
    const ok = popupSignupSchema.parse({ name: "Awa", email: "awa@example.com", consent: true, phone: "" });
    expect(ok.phone).toBeUndefined();
    expect(
      popupSignupSchema.safeParse({ name: "Awa", email: "awa@example.com", consent: true, projectType: "Piratage" }).success,
    ).toBe(false);
  });

  it("admin : préfixe de code et chemins contrôlés ; PATCH partiel sans défauts", () => {
    expect(createSitePopupSchema.safeParse({ ...DEFAULT_SITE_POPUP, codePrefix: "sdc" }).success).toBe(false);
    expect(createSitePopupSchema.safeParse({ ...DEFAULT_SITE_POPUP, includePaths: ["javascript:alert(1)"] }).success).toBe(false);
    expect(updateSitePopupSchema.parse({ isActive: true })).toEqual({ isActive: true });
  });

  it("devis : code avantage accepté s'il est bien formé, ignoré sinon", () => {
    const schema = createDevisSchema(defaultSiteQuoteConfigSettings);
    const base = { name: "Awa Koné", email: "awa@example.com", projectTypeId: "site-vitrine", budget: "300 000", timeline: timelineOptions[0]!.value };
    expect(schema.parse({ ...base, promoCode: "sdc-awa-7k2q" }).promoCode).toBe("SDC-AWA-7K2Q");
    expect(schema.parse({ ...base, promoCode: "<script>" }).promoCode).toBeUndefined();
  });
});
