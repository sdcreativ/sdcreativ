import type { QuoteAddon, QuotePageTier, QuoteProjectType } from "@/content/quote-config";
import {
  quoteAddons,
  quotePageTiers,
  quoteProjectTypes,
} from "@/content/quote-config";

export type SiteQuoteConfigSettings = {
  formTitle: string;
  formSubtitle: string;
  estimateNote: string;
  projectTypes: QuoteProjectType[];
  pageTiers: QuotePageTier[];
  addons: QuoteAddon[];
};

export const defaultSiteQuoteConfigSettings: SiteQuoteConfigSettings = {
  formTitle: "Configurez votre projet",
  formSubtitle: "Sélectionnez vos options — l'estimation se met à jour en temps réel.",
  estimateNote:
    "Estimation indicative HT. Un devis définitif vous sera transmis après étude de votre projet.",
  projectTypes: quoteProjectTypes,
  pageTiers: quotePageTiers,
  addons: quoteAddons,
};
