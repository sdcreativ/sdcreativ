import { describe, expect, it } from "vitest";
import { parseHostingCatalog } from "@/lib/hostinger-catalog";
import { computePlanPricing, renewalFromYear, resolvePlanHosting, type HostingCatalogEntry } from "@/lib/pricing-display";

/** Extrait réel de GET /api/billing/v1/catalog (relevé le 2026-10-07, catalogue hostingerfr). */
const apiSample = [
  {
    id: "hostingerfr-hosting-premium",
    name: "Premium Web Hosting",
    category: "HOSTING",
    prices: [
      { id: "p-1y", currency: "EUR", price: 11988, first_period_price: 3588, period: 1, period_unit: "year" },
      { id: "p-1m", currency: "EUR", price: 1199, first_period_price: 1199, period: 1, period_unit: "month" },
      { id: "p-2y", currency: "EUR", price: 23976, first_period_price: 7176, period: 2, period_unit: "year" },
      { id: "p-4y", currency: "EUR", price: 47952, first_period_price: 14352, period: 4, period_unit: "year" },
    ],
  },
  {
    id: "hostingerfr-hosting-cloudeconomy",
    name: "Cloud Startup",
    category: "HOSTING",
    prices: [
      { currency: "EUR", price: 115152, first_period_price: 38352, period: 4, period_unit: "year" },
      { currency: "EUR", price: 2599, first_period_price: 2599, period: 1, period_unit: "month" },
      { currency: "EUR", price: 28788, first_period_price: 11988, period: 1, period_unit: "year" },
    ],
  },
  {
    id: "hostingerfr-domain-com",
    name: ".COM Domain",
    category: "DOMAIN",
    prices: [{ currency: "EUR", price: 1699, first_period_price: 999, period: 1, period_unit: "year" }],
  },
];

const settings = {
  hostingEur: 150.87,
  hostingReferralEur: 28.7,
  hostingRenewalEur: 119.88,
  domainEur: 6.99,
  referralPercent: 20,
};

describe("parseHostingCatalog", () => {
  const entries = parseHostingCatalog({ data: apiSample });

  it("ne garde que l'hébergement, en 12 / 24 / 48 mois", () => {
    expect(entries.every((e) => e.packId.includes("hosting"))).toBe(true);
    expect(entries.filter((e) => e.packId === "hostingerfr-hosting-premium").map((e) => e.months).sort((a, b) => a - b)).toEqual([
      12, 24, 48,
    ]);
    expect(entries.some((e) => e.months === 1)).toBe(false);
  });

  it("prix normal = tarif mensuel × durée", () => {
    const premium12 = entries.find((e) => e.packId === "hostingerfr-hosting-premium" && e.months === 12);
    expect(premium12).toMatchObject({ promoCents: 3588, renewalCents: 11988, listCents: 1199 * 12, currency: "EUR" });
    const cloud48 = entries.find((e) => e.packId === "hostingerfr-hosting-cloudeconomy" && e.months === 48);
    expect(cloud48?.listCents).toBe(2599 * 48);
  });

  it("accepte aussi une réponse en tableau brut", () => {
    expect(parseHostingCatalog(apiSample)).toHaveLength(entries.length);
  });
});

describe("resolvePlanHosting avec le catalogue", () => {
  const catalog: HostingCatalogEntry[] = parseHostingCatalog(apiSample).map((e) => ({ ...e, pending: null }));

  it("Premium 12 mois : retrouve exactement le panier ivoirien", () => {
    const h = resolvePlanHosting(
      { includeHosting: true, hostingPackId: "hostingerfr-hosting-premium", hostingMonths: 12 },
      settings,
      catalog,
    );
    expect(h).toEqual({
      source: "catalog",
      packName: "Premium Web Hosting",
      months: 12,
      normalEur: 150.87, // 11,99 € × 12 + domaine 6,99 €
      paidEur: 28.7, // 35,88 € − 20 %
      renewalEurPerYear: 119.88,
    });
  });

  it("Premium 24 mois : renouvellement ramené à l'année, à partir de la 3e année", () => {
    const h = resolvePlanHosting(
      { includeHosting: true, hostingPackId: "hostingerfr-hosting-premium", hostingMonths: 24 },
      settings,
      catalog,
    );
    expect(h).toMatchObject({ normalEur: 294.75, paidEur: 57.41, renewalEurPerYear: 119.88 });
    expect(renewalFromYear(24)).toBe(3);
    expect(renewalFromYear(48)).toBe(5);
  });

  it("Cloud Startup 12 mois pour Business", () => {
    const h = resolvePlanHosting(
      { includeHosting: true, hostingPackId: "hostingerfr-hosting-cloudeconomy", hostingMonths: 12 },
      settings,
      catalog,
    );
    expect(h).toMatchObject({ normalEur: 318.87, paidEur: 95.9, renewalEurPerYear: 287.88 });
  });

  it("pack absent du catalogue (ou non choisi) : repli sur les prix manuels", () => {
    expect(resolvePlanHosting({ includeHosting: true, hostingPackId: "inconnu", hostingMonths: 12 }, settings, catalog)).toMatchObject({
      source: "manual",
      normalEur: 150.87,
      paidEur: 28.7,
    });
    expect(resolvePlanHosting({ includeHosting: false, hostingPackId: "hostingerfr-hosting-premium" }, settings, catalog)).toBeNull();
  });

  it("le calcul de la formule utilise le pack choisi", () => {
    const h = resolvePlanHosting(
      { includeHosting: true, hostingPackId: "hostingerfr-hosting-premium", hostingMonths: 12 },
      settings,
      catalog,
    )!;
    const b = computePlanPricing({
      baseHt: 150000,
      charges: [{ amount: 8000 }, { amount: 40000 }, { amount: 4800 }],
      includeHosting: true,
      hostingEur: h.normalEur,
      hostingReferralEur: h.paidEur,
      vatRate: 18,
    });
    expect(b.totalTtc).toBe(261519); // Essentiel : base 150 000 + 3 charges + Premium 12 mois parrainé
  });
});
