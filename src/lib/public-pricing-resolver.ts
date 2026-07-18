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
import { allowStaticContentFallback } from "@/lib/static-content-fallback";
import { connection } from "next/server";

export const PUBLIC_PRICING_PLANS_TAG = "public-pricing-plans";
export const PUBLIC_PRICING_REASSURANCE_TAG = "public-pricing-reassurance";

export async function getPricingPlans(locale = "fr"): Promise<PricingPlan[]> {
  await connection();
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticPlans : [];
  }

  try {
    const records = await listPublicPricingPlans({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toPricingPlan);
  } catch (error) {
    console.error("[public-pricing] plans fallback:", error);
  }

  return allowStaticContentFallback() ? staticPlans : [];
}

export async function getPricingReassurance(locale = "fr") {
  await connection();
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticReassurance : [];
  }

  try {
    const records = await listPublicPricingReassurance({ locale, visibleOnly: true });
    if (records.length > 0) {
      return records.map((r) => ({ label: r.label, description: r.description }));
    }
  } catch (error) {
    console.error("[public-pricing] reassurance fallback:", error);
  }

  return allowStaticContentFallback() ? staticReassurance : [];
}
