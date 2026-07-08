import {
  pricingPlans as staticPlans,
  pricingReassurance as staticReassurance,
} from "@/content/pricing";
import { isDatabaseConfigured } from "@/lib/db";
import {
  listPublicPricingPlans,
  listPublicPricingReassurance,
  toPricingPlan,
} from "@/lib/public-pricing";
import type { PricingPlan } from "@/content/pricing";

export async function getPricingPlans(locale = "fr"): Promise<PricingPlan[]> {
  if (!isDatabaseConfigured()) return staticPlans;

  try {
    const records = await listPublicPricingPlans({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toPricingPlan);
  } catch (error) {
    console.error("[public-pricing] plans fallback:", error);
  }

  return staticPlans;
}

export async function getPricingReassurance(locale = "fr") {
  if (!isDatabaseConfigured()) return staticReassurance;

  try {
    const records = await listPublicPricingReassurance({ locale, visibleOnly: true });
    if (records.length > 0) {
      return records.map((r) => ({ label: r.label, description: r.description }));
    }
  } catch (error) {
    console.error("[public-pricing] reassurance fallback:", error);
  }

  return staticReassurance;
}
