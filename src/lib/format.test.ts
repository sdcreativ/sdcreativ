import { describe, expect, it } from "vitest";
import {
  formatFcfa,
  formatFcfaShort,
  formatPriceFrom,
  hasPublicPrice,
  PRICE_ON_REQUEST_LABEL,
} from "@/lib/format";

describe("formatFcfa", () => {
  it("formate un montant entier en français", () => {
    expect(formatFcfa(1500000)).toMatch(/1[\s\u202f]?500[\s\u202f]?000/);
  });

  it("formatFcfaShort est un alias de formatFcfa", () => {
    expect(formatFcfaShort(750000)).toBe(formatFcfa(750000));
  });
});

describe("formatPriceFrom", () => {
  it("n’affiche jamais de montant public", () => {
    expect(formatPriceFrom(500000)).toBe(PRICE_ON_REQUEST_LABEL);
    expect(formatPriceFrom(0)).toBe(PRICE_ON_REQUEST_LABEL);
    expect(formatPriceFrom(null)).toBe(PRICE_ON_REQUEST_LABEL);
  });
});

describe("hasPublicPrice", () => {
  it("est toujours false (politique sans prix publics)", () => {
    expect(hasPublicPrice(0)).toBe(false);
    expect(hasPublicPrice(null)).toBe(false);
    expect(hasPublicPrice(undefined)).toBe(false);
    expect(hasPublicPrice(45_000)).toBe(false);
  });
});
