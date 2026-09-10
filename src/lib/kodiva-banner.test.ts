import { describe, expect, it } from "vitest";
import { isKodivaBannerHiddenPath } from "@/lib/kodiva-banner";

describe("isKodivaBannerHiddenPath", () => {
  it("hides the banner on the IA solutions pages", () => {
    expect(isKodivaBannerHiddenPath("/solutions-ia")).toBe(true);
    expect(isKodivaBannerHiddenPath("/solutions-ia/")).toBe(true);
    expect(isKodivaBannerHiddenPath("/en/solutions-ia")).toBe(true);
  });

  it("hides the banner on the products catalog", () => {
    expect(isKodivaBannerHiddenPath("/produits")).toBe(true);
    expect(isKodivaBannerHiddenPath("/en/products")).toBe(true);
  });

  it("keeps the banner on the rest of the public site", () => {
    expect(isKodivaBannerHiddenPath("/")).toBe(false);
    expect(isKodivaBannerHiddenPath("/services")).toBe(false);
    expect(isKodivaBannerHiddenPath("/en")).toBe(false);
  });
});
