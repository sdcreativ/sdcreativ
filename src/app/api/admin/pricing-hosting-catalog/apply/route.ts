import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { applyPendingHostingPrices } from "@/lib/hostinger-catalog";
import { recomputeAutoPlans } from "@/lib/public-pricing";
import { revalidatePricingPages } from "@/lib/site-revalidate";

/** Validation admin : les prix Hostinger en attente sont appliqués et les formules recalculées. */
export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const pricesApplied = await applyPendingHostingPrices();
  const plansUpdated = await recomputeAutoPlans();
  revalidatePricingPages();
  return NextResponse.json({ pricesApplied, plansUpdated });
}
