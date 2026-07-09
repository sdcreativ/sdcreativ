import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deletePublicService,
  getPublicServiceById,
  updatePublicService,
  updatePublicServiceSchema,
} from "@/lib/public-services";
import { revalidateServicesPages } from "@/lib/site-revalidate";
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
    const parsed = updatePublicServiceSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const item = await updatePublicService(id, parsed.data);
    if (!item) return NextResponse.json({ error: "Service introuvable." }, { status: 404 });

    revalidateServicesPages(item.slug);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/public-services/[id]] PATCH", error);
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
    const existing = await getPublicServiceById(id);
    if (!existing) return NextResponse.json({ error: "Service introuvable." }, { status: 404 });

    await deletePublicService(id);
    revalidateServicesPages(existing.slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/public-services/[id]] DELETE", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
