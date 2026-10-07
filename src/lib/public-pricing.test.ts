import { describe, expect, it } from "vitest";
import {
  assertPlanPricingConsistent,
  createPublicPricingPlanSchema,
  PricingPlanValidationError,
  pricingSettingsSchema,
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
    baseAmountHt: null,
    charges: [],
    includeHosting: false,
    compareAtAmount: null,
    discountLabel: null,
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

  it("résout le lien de parrainage sur les avantages marqués, et seulement eux", () => {
    const withPerks: PublicPricingPlanRecord = {
      ...record,
      perks: [
        { id: "hosting", title: "Hébergement", detail: "", icon: "Server", isVisible: true, referralLink: true },
        { id: "maintenance", title: "Maintenance", detail: "", icon: "Settings", isVisible: true },
      ],
    };
    const url = "https://www.hostinger.com/fr?REFERRALCODE=BMJAGENCEZMT";
    const settings = {
      referralUrl: url,
      vatRate: 18,
      hostingEur: 150.87,
      hostingReferralEur: 35.88,
      referralNote: "-{pourcentage} % grâce à notre partenariat Hostinger",
    };
    const [hosting, maintenance] = toPricingPlan(withPerks, settings).perks;
    expect(hosting?.href).toBe(url);
    expect(hosting?.note).toBeUndefined(); // pas de remise sur cette formule
    expect(maintenance?.href).toBeUndefined();
    expect(toPricingPlan(withPerks).perks[0]?.href).toBeUndefined();

    // Remise active (hébergement inclus + prix barré) : mention sous l'avantage hébergement seulement.
    const discounted = { ...withPerks, includeHosting: true, priceMode: "fixed" as const, priceAmount: 264729, compareAtAmount: 287000 };
    const [hostingOn, maintenanceOn] = toPricingPlan(discounted, settings).perks;
    expect(hostingOn?.note).toBe("-76 % grâce à notre partenariat Hostinger");
    expect(hostingOn).toMatchObject({ priceBefore: 116778, priceAfter: 27772 }); // TTC, façon Hostinger
    expect(maintenanceOn?.priceBefore).toBeUndefined();
    expect(hosting?.priceBefore).toBeUndefined(); // sans remise : pas de prix barré
    expect(maintenanceOn?.note).toBeUndefined();
  });

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

describe("charges et TVA", () => {
  it("valide les charges (libellé requis, montant entier ≥ 0)", () => {
    expect(updatePublicPricingPlanSchema.safeParse({ charges: [{ id: "a", label: "Hébergement", amount: 25000 }] }).success).toBe(true);
    expect(updatePublicPricingPlanSchema.safeParse({ charges: [{ id: "a", label: "", amount: 25000 }] }).success).toBe(false);
    expect(updatePublicPricingPlanSchema.safeParse({ charges: [{ id: "a", label: "X", amount: -5 }] }).success).toBe(false);
    expect(updatePublicPricingPlanSchema.safeParse({ baseAmountHt: null }).success).toBe(true);
  });

  const settings = {
    vatRate: 18,
    referralUrl: "https://www.hostinger.com/fr?REFERRALCODE=BMJAGENCEZMT",
    hostingEur: 150.87,
    hostingReferralEur: 35.88,
    referralNote: "-{pourcentage} % grâce à notre partenariat Hostinger",
  };

  it("borne la TVA et exige un prix parrainé ≤ prix normal", () => {
    expect(pricingSettingsSchema.safeParse(settings).success).toBe(true);
    expect(pricingSettingsSchema.safeParse({ ...settings, vatRate: 19.25 }).success).toBe(true);
    expect(pricingSettingsSchema.safeParse({ ...settings, vatRate: 101 }).success).toBe(false);
    expect(pricingSettingsSchema.safeParse({ ...settings, vatRate: 18.123 }).success).toBe(false);
    expect(pricingSettingsSchema.safeParse({ ...settings, hostingReferralEur: 200 }).success).toBe(false); // > prix normal
  });

  it("n'accepte qu'un lien de parrainage https (ou vide)", () => {
    expect(pricingSettingsSchema.safeParse({ ...settings, referralUrl: "" }).success).toBe(true);
    expect(pricingSettingsSchema.safeParse({ ...settings, referralUrl: "http://hostinger.com" }).success).toBe(false);
    expect(pricingSettingsSchema.safeParse({ ...settings, referralUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("valide le prix de l'hébergement en euros (≥ 0, au centime)", () => {
    expect(pricingSettingsSchema.safeParse({ ...settings, hostingEur: 0, hostingReferralEur: 0 }).success).toBe(true);
    expect(pricingSettingsSchema.safeParse({ ...settings, hostingEur: -1 }).success).toBe(false);
    expect(pricingSettingsSchema.safeParse({ ...settings, hostingEur: 150.871 }).success).toBe(false);
  });

  it("les charges ne portent plus de remise : le champ est ignoré", () => {
    const parsed = updatePublicPricingPlanSchema.parse({
      charges: [{ id: "c", label: "Licence", amount: 25000, discountPercent: 20 }],
      includeHosting: true,
    });
    expect(parsed.charges?.[0]).toEqual({ id: "c", label: "Licence", amount: 25000 });
    expect(parsed.includeHosting).toBe(true);
  });
});
