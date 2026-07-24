import { describe, expect, it, afterEach } from "vitest";
import { isEnglishLocaleEnabled } from "@/i18n/config";

describe("isEnglishLocaleEnabled", () => {
  const prev = process.env.ENGLISH_LOCALE_ENABLED;
  const prevPublic = process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.ENGLISH_LOCALE_ENABLED;
    else process.env.ENGLISH_LOCALE_ENABLED = prev;
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED;
    else process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED = prevPublic;
  });

  it("est désactivé par défaut (EN suspendu)", () => {
    delete process.env.ENGLISH_LOCALE_ENABLED;
    delete process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED;
    expect(isEnglishLocaleEnabled()).toBe(false);
  });

  it("peut être réactivé via ENGLISH_LOCALE_ENABLED=true", () => {
    process.env.ENGLISH_LOCALE_ENABLED = "true";
    expect(isEnglishLocaleEnabled()).toBe(true);
  });
});
