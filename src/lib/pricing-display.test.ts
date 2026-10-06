import { describe, expect, it } from "vitest";
import { computePlanTtc, formatPlanAmount, isSafePlanCtaHref, resolvePlanPriceDisplay } from "@/lib/pricing-display";
import { PRICE_ON_REQUEST_LABEL, PRICE_ON_REQUEST_LABEL_EN } from "@/lib/format";

const base = {
  priceAmount: 287000,
  currencyCode: "XOF",
  currencyLabel: "FCFA",
  taxMention: "ttc" as const,
  priceNote: undefined,
};

/** Normalise les espaces insécables produits par Intl. */
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("formatPlanAmount", () => {
  it("formate avec les séparateurs français", () => {
    expect(plain(formatPlanAmount(287000))).toBe("287 000");
    expect(plain(formatPlanAmount(1250000))).toBe("1 250 000");
  });
});

describe("resolvePlanPriceDisplay", () => {
  it("mode « à partir de » : préfixe + montant + devise et mention", () => {
    const display = resolvePlanPriceDisplay({ ...base, priceMode: "from" });
    expect(display.kind).toBe("amount");
    if (display.kind !== "amount") return;
    expect(display.prefix).toBe("À partir de");
    expect(plain(display.amount)).toBe("287 000");
    expect(display.suffix).toBe("FCFA TTC");
  });

  it("mode fixe : pas de préfixe, mention HT ou aucune", () => {
    const ht = resolvePlanPriceDisplay({ ...base, priceMode: "fixed", priceAmount: 450000, taxMention: "ht" });
    expect(ht).toMatchObject({ kind: "amount", prefix: null, suffix: "FCFA HT" });
    const none = resolvePlanPriceDisplay({ ...base, priceMode: "fixed", taxMention: "none" });
    expect(none).toMatchObject({ kind: "amount", suffix: "FCFA" });
  });

  it("mode sur devis : ni montant ni mention fiscale", () => {
    expect(resolvePlanPriceDisplay({ ...base, priceMode: "quote" })).toEqual({
      kind: "quote",
      label: PRICE_ON_REQUEST_LABEL,
    });
    expect(resolvePlanPriceDisplay({ ...base, priceMode: "quote" }, "en")).toEqual({
      kind: "quote",
      label: PRICE_ON_REQUEST_LABEL_EN,
    });
    expect(resolvePlanPriceDisplay({ ...base, priceMode: "quote", priceNote: "Sur devis" })).toEqual({
      kind: "quote",
      label: "Sur devis",
    });
  });

  it("retombe sur « sur devis » si le montant manque", () => {
    expect(resolvePlanPriceDisplay({ ...base, priceMode: "fixed", priceAmount: undefined }).kind).toBe("quote");
  });

  it("utilise le code devise si aucun libellé public", () => {
    const display = resolvePlanPriceDisplay({ ...base, priceMode: "fixed", currencyLabel: "", currencyCode: "EUR" });
    expect(display).toMatchObject({ suffix: "EUR TTC" });
  });
});

describe("isSafePlanCtaHref", () => {
  it("accepte chemins internes, ancres et https", () => {
    expect(isSafePlanCtaHref("/devis")).toBe(true);
    expect(isSafePlanCtaHref("/en/devis?plan=pro")).toBe(true);
    expect(isSafePlanCtaHref("#contact")).toBe(true);
    expect(isSafePlanCtaHref("https://sdcreativ.com/devis")).toBe(true);
  });

  it("refuse les schémas dangereux et URLs protocol-relative", () => {
    expect(isSafePlanCtaHref("javascript:alert(1)")).toBe(false);
    expect(isSafePlanCtaHref("//evil.example")).toBe(false);
    expect(isSafePlanCtaHref("http://insecure.example")).toBe(false);
    expect(isSafePlanCtaHref("data:text/html,x")).toBe(false);
  });
});

describe("computePlanTtc", () => {
  it("TTC = (base HT + charges HT) × (1 + TVA)", () => {
    const b = computePlanTtc(200000, [{ amount: 25000 }, { amount: 18000 }], 18);
    expect(b).toEqual({
      baseHt: 200000,
      chargesHt: 43000,
      subtotalHt: 243000,
      vatRate: 18,
      vatAmount: 43740,
      totalTtc: 286740,
    });
  });

  it("sans charges ni TVA, le TTC égale la base", () => {
    expect(computePlanTtc(450000, [], 0).totalTtc).toBe(450000);
  });

  it("taux décimal arrondi au franc près, sans erreur de flottant", () => {
    // 100 001 × 1,1925 = 119 251,1925 → 119 251
    expect(computePlanTtc(100001, [], 19.25).totalTtc).toBe(119251);
    expect(computePlanTtc(100, [], 0.1 + 0.2).vatRate).toBe(0.3);
  });
});
