import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { importStaticPricing } from "@/lib/public-pricing";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePricingPages } from "@/lib/site-revalidate";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const result = await importStaticPricing();
  if (result.plansImported > 0 || result.reassuranceImported > 0) revalidatePricingPages();
  return NextResponse.json(result);
}
