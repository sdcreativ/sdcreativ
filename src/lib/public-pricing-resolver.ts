import { unstable_cache } from "next/cache";
import {
  pricingPlans as staticPlans,
  pricingPlansEn as staticPlansEn,
  pricingReassurance as staticReassurance,
  pricingReassuranceEn as staticReassuranceEn,
} from "@/content/pricing";
import { isDatabaseConfigured } from "@/lib/db";
import {
  listPublicPricingPlans,
  listPublicPricingReassurance,
  toPricingPlan,
} from "@/lib/public-pricing";
import type { PricingPlan } from "@/content/pricing";

export const PUBLIC_PRICING_PLANS_TAG = "public-pricing-plans";
export const PUBLIC_PRICING_REASSURANCE_TAG = "public-pricing-reassurance";

/**
 * Les 3 formules tarifs sont du contenu produit (pas de démo) :
 * si la CMS est vide / plans masqués, on garde toujours le catalogue code.
 */
async function loadPricingPlans(locale: string): Promise<PricingPlan[]> {
  if (!isDatabaseConfigured()) {
    return locale === "en" ? staticPlansEn : staticPlans;
  }

  try {
    const records = await listPublicPricingPlans({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toPricingPlan);
  } catch (error) {
    console.error("[public-pricing] plans fallback:", error);
  }

  return locale === "en" ? staticPlansEn : staticPlans;
}

async function loadPricingReassurance(locale: string) {
  if (!isDatabaseConfigured()) {
    return locale === "en" ? staticReassuranceEn : staticReassurance;
  }

  try {
    const records = await listPublicPricingReassurance({ locale, visibleOnly: true });
    if (records.length > 0) {
      return records.map((r) => ({ label: r.label, description: r.description }));
    }
  } catch (error) {
    console.error("[public-pricing] reassurance fallback:", error);
  }

  return locale === "en" ? staticReassuranceEn : staticReassurance;
}

/** Tarifs publics — cache taggé (ISR) plutôt que force-dynamic + connection(). */
export async function getPricingPlans(locale = "fr"): Promise<PricingPlan[]> {
  return unstable_cache(
    () => loadPricingPlans(locale),
    ["public-pricing-plans", locale],
    { tags: [PUBLIC_PRICING_PLANS_TAG], revalidate: 300 },
  )();
}

export async function getPricingReassurance(locale = "fr") {
  return unstable_cache(
    () => loadPricingReassurance(locale),
    ["public-pricing-reassurance", locale],
    { tags: [PUBLIC_PRICING_REASSURANCE_TAG], revalidate: 300 },
  )();
}
