import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  createPublicPricingPlan,
  createPublicPricingPlanSchema,
  listPublicPricingPlans,
  formatPlanIssue,
  PricingPlanValidationError,
} from "@/lib/public-pricing";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePricingPages } from "@/lib/site-revalidate";

export async function GET(request: Request) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const locale = new URL(request.url).searchParams.get("locale") ?? undefined;
  const plans = await listPublicPricingPlans({ locale });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const parsed = createPublicPricingPlanSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: formatPlanIssue(parsed.error.issues[0]) }, { status: 400 });
  let plan;
  try {
    plan = await createPublicPricingPlan(parsed.data);
  } catch (error) {
    if (error instanceof PricingPlanValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  revalidatePricingPages();
  return NextResponse.json({ plan }, { status: 201 });
}
