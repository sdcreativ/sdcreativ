import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deletePublicJobOffer,
  updatePublicJobOffer,
  updatePublicJobOfferSchema,
} from "@/lib/public-job-offers";
import { revalidateCareersPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePublicJobOfferSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const item = await updatePublicJobOffer(id, parsed.data);
    if (!item) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

    revalidateCareersPages();
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/public-job-offers/[id]] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const deleted = await deletePublicJobOffer(id);
    if (!deleted) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });

    revalidateCareersPages();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/public-job-offers/[id]] DELETE", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
