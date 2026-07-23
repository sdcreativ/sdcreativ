import { defaultSiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import { getSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";

/** Config devis pour pages publiques (cache taggé, ISR). */
export async function getQuoteConfig() {
  return getSiteQuoteConfigSettings();
}

export async function getQuoteConfigOrDefault() {
  try {
    return await getQuoteConfig();
  } catch {
    return defaultSiteQuoteConfigSettings;
  }
}
