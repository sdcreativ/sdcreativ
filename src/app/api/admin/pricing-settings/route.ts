import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { formatPlanIssue, getPricingVatRate, pricingVatRateSchema, updatePricingVatRate } from "@/lib/public-pricing";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePricingPages } from "@/lib/site-revalidate";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  return NextResponse.json({ vatRate: await getPricingVatRate() });
}

export async function PUT(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const parsed = pricingVatRateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: formatPlanIssue(parsed.error.issues[0]) }, { status: 400 });
  const result = await updatePricingVatRate(parsed.data.vatRate);
  revalidatePricingPages();
  return NextResponse.json(result);
}
