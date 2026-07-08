import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  deletePublicRealisation,
  getPublicRealisationById,
  updatePublicRealisation,
  updatePublicRealisationSchema,
} from "@/lib/public-realisations";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateRealisationsPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const existing = await getPublicRealisationById(id);
  const parsed = updatePublicRealisationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  const realisation = await updatePublicRealisation(id, parsed.data);
  if (!realisation) return NextResponse.json({ error: "Réalisation introuvable." }, { status: 404 });
  revalidateRealisationsPages(realisation.slug);
  if (existing && existing.slug !== realisation.slug) revalidateRealisationsPages(existing.slug);
  return NextResponse.json({ realisation });
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const existing = await getPublicRealisationById(id);
  const deleted = await deletePublicRealisation(id);
  if (!deleted) return NextResponse.json({ error: "Réalisation introuvable." }, { status: 404 });
  revalidateRealisationsPages(existing?.slug);
  return NextResponse.json({ success: true });
}
