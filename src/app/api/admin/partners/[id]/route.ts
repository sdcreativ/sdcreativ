import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { deletePublicPartner, updatePublicPartner, updatePublicPartnerSchema } from "@/lib/public-partners";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePartnersPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const { id } = await params;
    const parsed = updatePublicPartnerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    const partner = await updatePublicPartner(id, parsed.data);
    if (!partner) return NextResponse.json({ error: "Partenaire introuvable." }, { status: 404 });
    revalidatePartnersPages();
    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mise à jour impossible." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const { id } = await params;
    const deleted = await deletePublicPartner(id);
    if (!deleted) return NextResponse.json({ error: "Partenaire introuvable." }, { status: 404 });
    revalidatePartnersPages();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Suppression impossible." }, { status: 400 });
  }
}
