import { describe, expect, it } from "vitest";
import { buildPlanCtaHref, formatReferralNote, baseHtFromTtc, computePlanPricing, computePlanTtc, eurToXof, formatPlanAmount, isSafePlanCtaHref, resolvePlanPriceDisplay } from "@/lib/pricing-display";
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
      discountHt: 0,
      subtotalHt: 243000,
      vatRate: 18,
      vatAmount: 43740,
      totalTtc: 286740,
      totalTtcBeforeDiscount: 286740,
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

describe("remise parrainage", () => {
  it("applique -20 % uniquement sur la charge hébergement", () => {
    const b = computePlanTtc(200000, [{ amount: 43000, discountPercent: 20 }, { amount: 10000 }], 18);
    expect(b.discountHt).toBe(8600);
    expect(b.subtotalHt).toBe(244400); // 200 000 + 53 000 − 8 600
    expect(b.totalTtc).toBe(288392);
    expect(b.totalTtcBeforeDiscount).toBe(298540);
  });

  it("borne la remise à 100 % de la charge", () => {
    expect(computePlanTtc(1000, [{ amount: 500, discountPercent: 150 }], 0).discountHt).toBe(500);
  });

  it("affiche le prix barré seulement s'il dépasse le prix final", () => {
    const plan = { ...base, priceMode: "fixed" as const, priceAmount: 276592 };
    const withDiscount = resolvePlanPriceDisplay({ ...plan, compareAtAmount: 286740 });
    expect(withDiscount.kind === "amount" && plain(withDiscount.compareAt ?? "")).toBe("286 740");
    const noDiscount = resolvePlanPriceDisplay({ ...plan, compareAtAmount: 276592 });
    expect(noDiscount.kind === "amount" && noDiscount.compareAt).toBeNull();
  });
});

describe("baseHtFromTtc", () => {
  it("retrouve une base HT qui redonne le TTC actuel (exact si atteignable)", () => {
    expect(baseHtFromTtc(287000, 18)).toBe(243220);
    expect(computePlanTtc(baseHtFromTtc(287000, 18), [], 18).totalTtc).toBe(287000);
    expect(computePlanTtc(baseHtFromTtc(450000, 18), [], 18).totalTtc).toBe(450000);
  });

  it("reste à 1 franc près quand le TTC n'est pas atteignable", () => {
    // 669 491 × 1,18 = 789 999,38 ; 669 492 × 1,18 = 790 000,56 → 790 000 impossible.
    const ttc = computePlanTtc(baseHtFromTtc(790000, 18), [], 18).totalTtc;
    expect(Math.abs(ttc - 790000)).toBeLessThanOrEqual(1);
  });
});

describe("hébergement Hostinger parrainé", () => {
  const settings = { hostingEur: 143.86, referralPercent: 20, vatRate: 18 };

  it("convertit 143,86 € en FCFA à la parité fixe", () => {
    expect(eurToXof(143.86)).toBe(94366);
  });

  it("applique -20 % à l'hébergement seulement, pas aux charges", () => {
    const b = computePlanPricing({ baseHt: 200000, charges: [{ amount: 25000 }], includeHosting: true, ...settings });
    expect(b.otherChargesHt).toBe(25000);
    expect(b.hostingHt).toBe(94366);
    expect(b.discountHt).toBe(18873); // 20 % de 94 366
    expect(b.subtotalHt).toBe(200000 + 25000 + 94366 - 18873);
    expect(b.totalTtc).toBe(Math.round(b.subtotalHt * 1.18));
    expect(b.totalTtcBeforeDiscount).toBe(Math.round((200000 + 25000 + 94366) * 1.18));
  });

  it("sans hébergement inclus : ni hébergement ni remise", () => {
    const b = computePlanPricing({ baseHt: 200000, charges: [{ amount: 25000 }], includeHosting: false, ...settings });
    expect(b.hostingHt).toBe(0);
    expect(b.discountHt).toBe(0);
    expect(b.totalTtc).toBe(b.totalTtcBeforeDiscount);
  });
});

describe("bouton « Demander un devis »", () => {
  it("transmet la formule, et l'offre seulement si la remise s'applique", () => {
    expect(buildPlanCtaHref("/devis", "essentiel", false)).toBe("/devis?formule=essentiel");
    expect(buildPlanCtaHref("/devis", "essentiel", true)).toBe("/devis?formule=essentiel&offre=parrainage-hebergement");
  });

  it("conserve les paramètres existants (type de projet) et l'ancre", () => {
    expect(buildPlanCtaHref("/devis?type=e-commerce#form", "business", true)).toBe(
      "/devis?type=e-commerce&formule=business&offre=parrainage-hebergement#form",
    );
  });

  it("ne touche pas aux liens externes ni aux ancres", () => {
    expect(buildPlanCtaHref("https://wa.me/225000", "business", true)).toBe("https://wa.me/225000");
    expect(buildPlanCtaHref("#contact", "business", true)).toBe("#contact");
  });
});

describe("mention de remise", () => {
  it("remplace {pourcentage} par le % de parrainage", () => {
    expect(formatReferralNote("-{pourcentage} % grâce à notre partenariat Hostinger", 20)).toBe(
      "-20 % grâce à notre partenariat Hostinger",
    );
    expect(formatReferralNote("Remise de {pourcentage} %", 12.5)).toBe("Remise de 12,5 %");
  });
});
