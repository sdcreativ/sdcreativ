import { describe, expect, it } from "vitest";
import { isEnglishLocaleEnabled } from "@/i18n/config";

describe("isEnglishLocaleEnabled", () => {
  it("est désactivé complètement (aucun override env)", () => {
    process.env.ENGLISH_LOCALE_ENABLED = "true";
    process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED = "true";
    expect(isEnglishLocaleEnabled()).toBe(false);
    delete process.env.ENGLISH_LOCALE_ENABLED;
    delete process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED;
  });
});
