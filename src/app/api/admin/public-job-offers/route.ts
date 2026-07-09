import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createPublicJobOffer,
  createPublicJobOfferSchema,
  listPublicJobOffers,
} from "@/lib/public-job-offers";
import { revalidateCareersPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const items = await listPublicJobOffers();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api/admin/public-job-offers] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createPublicJobOfferSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const item = await createPublicJobOffer(parsed.data);
    revalidateCareersPages();
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[api/admin/public-job-offers] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
