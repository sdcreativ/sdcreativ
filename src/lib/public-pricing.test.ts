import { describe, expect, it } from "vitest";
import {
  assertPlanPricingConsistent,
  createPublicPricingPlanSchema,
  PricingPlanValidationError,
  toPricingPlan,
  updatePublicPricingPlanSchema,
  type PublicPricingPlanRecord,
} from "@/lib/public-pricing";
import { pricingPlans, pricingPlansEn } from "@/content/pricing";

const perk = { id: "hosting", title: "Hébergement + nom de domaine inclus", detail: "Pendant 1 an", icon: "Server" };

describe("updatePublicPricingPlanSchema", () => {
  it("un PATCH partiel (Masquer) ne réinjecte aucune valeur par défaut", () => {
    // Régression : locale/variant/highlighted repassaient à fr/primary/false.
    expect(updatePublicPricingPlanSchema.parse({ isVisible: false })).toEqual({ isVisible: false });
  });

  it("refuse une destination de bouton dangereuse", () => {
    expect(updatePublicPricingPlanSchema.safeParse({ ctaHref: "javascript:alert(1)" }).success).toBe(false);
    expect(updatePublicPricingPlanSchema.safeParse({ ctaHref: "/devis" }).success).toBe(true);
  });

  it("refuse une icône hors du jeu existant et un mode de prix inconnu", () => {
    expect(updatePublicPricingPlanSchema.safeParse({ perks: [{ ...perk, icon: "Skull" }] }).success).toBe(false);
    expect(updatePublicPricingPlanSchema.safeParse({ priceMode: "free" }).success).toBe(false);
  });

  it("refuse un montant non entier ou négatif", () => {
    expect(updatePublicPricingPlanSchema.safeParse({ priceAmount: 287000.5 }).success).toBe(false);
    expect(updatePublicPricingPlanSchema.safeParse({ priceAmount: -1 }).success).toBe(false);
  });
});

describe("createPublicPricingPlanSchema", () => {
  it("applique les valeurs par défaut à la création", () => {
    const parsed = createPublicPricingPlanSchema.parse({
      name: "Essentiel",
      tagline: "Pour démarrer.",
      features: ["Design responsive"],
      perks: [perk],
    });
    expect(parsed).toMatchObject({
      priceMode: "quote",
      currencyCode: "XOF",
      currencyLabel: "FCFA",
      locale: "fr",
      variant: "primary",
      isVisible: true,
    });
    expect(parsed.perks[0]).toMatchObject({ isVisible: true, icon: "Server" });
  });
});

describe("assertPlanPricingConsistent", () => {
  it("exige un montant hors mode sur devis", () => {
    expect(() => assertPlanPricingConsistent({ priceMode: "fixed", priceAmount: null })).toThrow(
      PricingPlanValidationError,
    );
    expect(() => assertPlanPricingConsistent({ priceMode: "from", priceAmount: 0 })).toThrow(PricingPlanValidationError);
    expect(() => assertPlanPricingConsistent({ priceMode: "quote", priceAmount: null })).not.toThrow();
    expect(() => assertPlanPricingConsistent({ priceMode: "fixed", priceAmount: 450000 })).not.toThrow();
  });
});

describe("toPricingPlan", () => {
  const record: PublicPricingPlanRecord = {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "business",
    name: "Business",
    tagline: "To sell online.",
    priceMode: "quote",
    priceAmount: null,
    currencyCode: "XOF",
    currencyLabel: "FCFA",
    taxMention: "none",
    priceNote: null,
    features: ["Order management"],
    perks: [],
    highlighted: false,
    badgeLabel: null,
    variant: "accent",
    ctaLabel: null,
    ctaHref: null,
    locale: "en",
    sortOrder: 2,
    isVisible: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };

  it("conserve le parcours devis par langue si le bouton est vide", () => {
    expect(toPricingPlan(record)).toMatchObject({ ctaLabel: "Get a quote", ctaHref: "/en/devis" });
    expect(toPricingPlan({ ...record, locale: "fr" })).toMatchObject({ ctaLabel: "Demander un devis", ctaHref: "/devis" });
  });
});

describe("catalogue code", () => {
  it("garde exactement trois formules FR avec WordPress + sur mesure", () => {
    expect(pricingPlans.map((p) => p.id)).toEqual(["essentiel", "professionnel", "business"]);
    for (const plan of pricingPlans) {
      expect(plan.features.slice(0, 2)).toEqual(["Développé avec WordPress", "Développement sur mesure"]);
      expect(plan.perks.map((p) => p.title)).toEqual([
        "Hébergement + nom de domaine inclus",
        "Maintenance gratuite pendant 1 an",
      ]);
    }
  });

  it("ne met pas de français dans le catalogue EN", () => {
    expect(pricingPlansEn.every((p) => p.ctaHref === "/en/devis" && p.priceMode === "quote")).toBe(true);
  });
});
