import { describe, expect, it } from "vitest";
import {
  amountToXof,
  formatMoney,
  normalizeCurrency,
  resolveExchangeRateToXof,
  suggestedRateToXof,
} from "@/lib/currencies";

describe("normalizeCurrency", () => {
  it("accepte les devises supportées", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
    expect(normalizeCurrency("USD")).toBe("USD");
  });

  it("retombe sur XOF si inconnu", () => {
    expect(normalizeCurrency("BTC")).toBe("XOF");
    expect(normalizeCurrency(null)).toBe("XOF");
  });
});

describe("suggestedRateToXof", () => {
  it("retourne null pour XOF", () => {
    expect(suggestedRateToXof("XOF")).toBeNull();
  });

  it("propose un taux pour EUR", () => {
    expect(suggestedRateToXof("EUR")).toBe(655.957);
  });
});

describe("resolveExchangeRateToXof", () => {
  it("priorise le taux explicite", () => {
    expect(resolveExchangeRateToXof("EUR", 650)).toBe(650);
  });

  it("utilise le taux indicatif sinon", () => {
    expect(resolveExchangeRateToXof("USD", null)).toBe(600);
  });
});

describe("amountToXof", () => {
  it("ne convertit pas le XOF", () => {
    expect(amountToXof(1000, "XOF", null)).toBe(1000);
  });

  it("convertit avec le taux figé", () => {
    expect(amountToXof(10, "EUR", 655.957)).toBe(6560);
  });

  it("retourne null si taux manquant", () => {
    expect(amountToXof(10, "EUR", null)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formate le FCFA sans décimales", () => {
    expect(formatMoney(1500000, "XOF")).toMatch(/1[\s\u202f]?500[\s\u202f]?000/);
    expect(formatMoney(1500000, "XOF")).toContain("FCFA");
  });

  it("formate l'euro", () => {
    expect(formatMoney(1200, "EUR")).toMatch(/1[\s\u202f]?200/);
  });
});
