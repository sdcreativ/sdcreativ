import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  deletePublicPricingPlan,
  formatPlanIssue,
  PricingPlanValidationError,
  updatePublicPricingPlan,
  updatePublicPricingPlanSchema,
} from "@/lib/public-pricing";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePricingPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const parsed = updatePublicPricingPlanSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: formatPlanIssue(parsed.error.issues[0]) }, { status: 400 });
  let plan;
  try {
    plan = await updatePublicPricingPlan(id, parsed.data);
  } catch (error) {
    if (error instanceof PricingPlanValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
  if (!plan) return NextResponse.json({ error: "Formule introuvable." }, { status: 404 });
  revalidatePricingPages();
  return NextResponse.json({ plan });
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const deleted = await deletePublicPricingPlan(id);
  if (!deleted) return NextResponse.json({ error: "Formule introuvable." }, { status: 404 });
  revalidatePricingPages();
  return NextResponse.json({ success: true });
}
