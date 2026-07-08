import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderPublicPricingPlan } from "@/lib/public-pricing";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePricingPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const parsed = z.object({ direction: z.enum(["up", "down"]) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const plan = await reorderPublicPricingPlan(id, parsed.data.direction);
  if (!plan) return NextResponse.json({ error: "Formule introuvable." }, { status: 404 });
  revalidatePricingPages();
  return NextResponse.json({ plan });
}
