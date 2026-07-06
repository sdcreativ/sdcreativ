import { describe, expect, it } from "vitest";
import { formatFcfa, formatFcfaShort, formatPriceFrom } from "@/lib/format";

describe("formatFcfa", () => {
  it("formate un montant entier en français", () => {
    expect(formatFcfa(1500000)).toMatch(/1[\s\u202f]?500[\s\u202f]?000/);
  });

  it("formatFcfaShort est un alias de formatFcfa", () => {
    expect(formatFcfaShort(750000)).toBe(formatFcfa(750000));
  });
});

describe("formatPriceFrom", () => {
  it("préfixe le montant avec À partir de", () => {
    expect(formatPriceFrom(500000)).toContain("À partir de");
    expect(formatPriceFrom(500000)).toContain("FCFA");
  });
});
