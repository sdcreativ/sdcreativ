import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderPublicPartner } from "@/lib/public-partners";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePartnersPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const { id } = await params;
    const parsed = z.object({ direction: z.enum(["up", "down"]) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    const partner = await reorderPublicPartner(id, parsed.data.direction);
    if (!partner) return NextResponse.json({ error: "Partenaire introuvable." }, { status: 404 });
    revalidatePartnersPages();
    return NextResponse.json({ partner });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur." }, { status: 400 });
  }
}
