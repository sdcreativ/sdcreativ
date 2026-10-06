import { describe, expect, it } from "vitest";
import { createDevisSchema } from "@/lib/validations/devis";
import { defaultSiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import { timelineOptions } from "@/content/contact-options";

const schema = createDevisSchema(defaultSiteQuoteConfigSettings);
const base = {
  name: "Awa Koné",
  email: "awa@example.com",
  projectTypeId: "site-vitrine",
  budget: "300 000 FCFA",
  timeline: timelineOptions[0]!.value,
};

describe("devis — formule et offre venant des cartes tarifs", () => {
  it("conserve une formule et une offre valides", () => {
    const parsed = schema.safeParse({ ...base, pricingPlan: "essentiel", pricingOffer: "parrainage-hebergement" });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ pricingPlan: "essentiel", pricingOffer: "parrainage-hebergement" });
  });

  it("ignore des valeurs invalides sans bloquer la demande", () => {
    const parsed = schema.safeParse({ ...base, pricingPlan: "<script>", pricingOffer: "gratuit" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.pricingPlan).toBeUndefined();
    expect(parsed.data?.pricingOffer).toBeUndefined();
  });
});
