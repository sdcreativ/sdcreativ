import { describe, expect, it } from "vitest";
import { formatPlanAmount, isSafePlanCtaHref, resolvePlanPriceDisplay } from "@/lib/pricing-display";
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
