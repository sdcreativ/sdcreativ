import { describe, expect, it } from "vitest";
import { defaultQuoteCalculatorConfig } from "@/lib/quote-calculator";
import { canPriceQuote, pricedQuoteLines, quoteRequestFromConfig, stripQuantitySuffix } from "@/lib/quote-pricing";

describe("quote pricing", () => {
  it("recalcule les montants, écarte les lignes à 0 et suffixe la quantité", () => {
    const result = pricedQuoteLines([
      { label: "Boutique en ligne", quantity: 1, unitPrice: 1_500_000 },
      { label: "Fiche produit (×3)", quantity: 4, unitPrice: 25_000 },
      { label: "Offert", quantity: 1, unitPrice: 0 },
    ]);
    expect(result.subtotal).toBe(1_600_000);
    expect(result.lines.map((l) => l.label)).toEqual(["Boutique en ligne", "Fiche produit (×4)"]);
  });

  it("retire le suffixe de quantité pour l'édition", () => {
    expect(stripQuantitySuffix("Page (×12)")).toBe("Page");
    expect(stripQuantitySuffix("Page")).toBe("Page");
  });

  it("n'autorise le chiffrage qu'avant signature et hors archive", () => {
    expect(canPriceQuote({ status: "follow_up" })).toBe(true);
    expect(canPriceQuote({ status: "negotiation" })).toBe(true);
    expect(canPriceQuote({ status: "signed" })).toBe(false);
    expect(canPriceQuote({ status: "invoiced" })).toBe(false);
    expect(canPriceQuote({ status: "sent", archivedAt: "2026-10-01T00:00:00.000Z" })).toBe(false);
  });

  it("reconstitue la demande et propose les lignes de la grille dans la devise du devis", () => {
    const { request, suggestedLines } = quoteRequestFromConfig(
      {
        projectTypeId: "site-vitrine",
        projectLabel: "Site vitrine",
        pageTierId: "6-10",
        addonIds: [defaultQuoteCalculatorConfig.addons[0]!.id, "inconnue"],
        metadata: { pricingPlan: "essentiel" },
      },
      defaultQuoteCalculatorConfig,
      655.957,
    );
    expect(request.pageTier).toBe("6 à 10 pages");
    expect(request.addons).toEqual([defaultQuoteCalculatorConfig.addons[0]!.label]);
    expect(request.pricingPlan).toBe("essentiel");
    expect(suggestedLines[0]).toEqual({ label: "Site vitrine", quantity: 1, unitPrice: Math.round(350_000 / 655.957) });
    expect(suggestedLines).toHaveLength(3);
  });
});

describe("avantage du code popup", () => {
  it("décrit la promesse depuis les conditions figées", async () => {
    const { describeBenefit } = await import("@/lib/client-benefits-types");
    const terms = { kind: "maintenance_discount" as const, percent: 50, startMonths: 12, durationMonths: 12 };
    expect(describeBenefit(terms, "-50 % sur la maintenance de la 2ᵉ année à")).toBe("-50 % sur la maintenance de la 2e année");
    expect(describeBenefit({ ...terms, startMonths: 0, durationMonths: 3 })).toBe(
      "-50 % sur la maintenance pendant 3 mois, dès la signature",
    );
    expect(describeBenefit({ kind: "none", percent: null, startMonths: null, durationMonths: null }, " Audit offert ")).toBe("Audit offert");
  });

  it("écrit le code et l'avantage sur le devis", async () => {
    const { quotePromoText } = await import("@/lib/quote-pricing");
    expect(quotePromoText({ metadata: { promoCode: "SDC-ABC123", promoOffer: "-50 % sur la maintenance de la 2e année" } })).toBe(
      "Code SDC-ABC123 : -50 % sur la maintenance de la 2e année",
    );
    expect(quotePromoText({ metadata: { promoCode: null } })).toBeNull();
  });
});
