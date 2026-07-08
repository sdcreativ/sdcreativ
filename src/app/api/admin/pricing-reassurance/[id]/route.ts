import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  deletePublicPricingReassurance,
  updatePublicPricingReassurance,
  updatePublicPricingReassuranceSchema,
} from "@/lib/public-pricing";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePricingPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const parsed = updatePublicPricingReassuranceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  const item = await updatePublicPricingReassurance(id, parsed.data);
  if (!item) return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
  revalidatePricingPages();
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const deleted = await deletePublicPricingReassurance(id);
  if (!deleted) return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
  revalidatePricingPages();
  return NextResponse.json({ success: true });
}
