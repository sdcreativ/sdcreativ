import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { createPublicPartner, createPublicPartnerSchema, listPublicPartners } from "@/lib/public-partners";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePartnersPages } from "@/lib/site-revalidate";

export async function GET(request: Request) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const locale = new URL(request.url).searchParams.get("locale") ?? undefined;
    const partners = await listPublicPartners({ locale });
    return NextResponse.json({ partners });
  } catch (error) {
    console.error("[api/admin/partners] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const parsed = createPublicPartnerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    const partner = await createPublicPartner(parsed.data);
    revalidatePartnersPages();
    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Création impossible." }, { status: 400 });
  }
}
