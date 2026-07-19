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
  formSubtitle:
    "Sélectionnez le type de projet et les options souhaitées — nous vous enverrons un devis personnalisé.",
  estimateNote:
    "Les montants ne sont pas affichés ici : un devis détaillé HT vous sera transmis après étude de votre projet.",
  projectTypes: quoteProjectTypes,
  pageTiers: quotePageTiers,
  addons: quoteAddons,
};
