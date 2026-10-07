import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PricingPlanCard } from "@/components/sections/PricingPlanCard";
import type { PricingPlan } from "@/content/pricing";

const plan: PricingPlan = {
  id: "essentiel",
  name: "Essentiel",
  tagline: "Pour démarrer.",
  priceMode: "fixed",
  priceAmount: 197995,
  compareAtAmount: 287000,
  currencyCode: "XOF",
  currencyLabel: "FCFA",
  taxMention: "ttc",
  variant: "primary",
  features: ["SEO initial"],
  perks: [
    {
      id: "hosting",
      title: "Hébergement + nom de domaine inclus",
      detail: "Pendant 1 an",
      icon: "Server",
      isVisible: true,
      href: "https://www.hostinger.com/fr?REFERRALCODE=BMJAGENCEZMT",
      note: "-76 % grâce à notre partenariat Hostinger",
      priceBefore: 116778,
      priceAfter: 27772,
      renewalPerYear: 92790,
    },
  ],
  ctaLabel: "Demander un devis",
  ctaHref: "/devis?type=site-vitrine",
};

/** Texte visible (balises retirées, espaces insécables normalisés). */
const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/[  ]/g, " ");

describe("PricingPlanCard — remise façon Hostinger", () => {
  const html = renderToStaticMarkup(createElement(PricingPlanCard, { plan }));

  it("affiche l'économie, le prix barré et le prix final", () => {
    expect(text(html)).toContain("Économisez 89 005 FCFA");
    expect(html).toMatch(/<del>287\s000 FCFA<\/del>/);
    expect(text(html)).toContain("197 995");
  });

  it("affiche sous l'avantage hébergement la mention, les prix et le renouvellement", () => {
    expect(text(html)).toContain("-76 % grâce à notre partenariat Hostinger");
    expect(text(html)).toContain("116 778 FCFA");
    expect(text(html)).toContain("27 772 FCFA TTC");
    expect(text(html)).toContain("Renouvellement à partir de la 2ᵉ année : env. 92 790 FCFA TTC/an");
  });

  it("lien de parrainage sponsorisé et bouton devis avec formule + offre", () => {
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain('href="/devis?type=site-vitrine&amp;formule=essentiel&amp;offre=parrainage-hebergement"');
  });

  it("sans remise : ni pastille, ni prix barré, ni offre dans le lien", () => {
    const plain = renderToStaticMarkup(
      createElement(PricingPlanCard, {
        plan: { ...plan, compareAtAmount: undefined, perks: [{ ...plan.perks[0]!, note: undefined, priceBefore: undefined, priceAfter: undefined }] },
      }),
    );
    expect(text(plain)).not.toContain("Économisez");
    expect(plain).not.toContain("<del>287");
    expect(plain).not.toContain("offre=");
  });
});
