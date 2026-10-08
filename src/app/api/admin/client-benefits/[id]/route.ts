import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { cancelClientBenefit } from "@/lib/client-benefits";

type Props = { params: Promise<{ id: string }> };

/** Annulation manuelle d'un avantage (ex. devis annulé). */
export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.clients.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  if (!(await cancelClientBenefit(id))) return NextResponse.json({ error: "Avantage introuvable ou déjà clôturé." }, { status: 404 });
  return NextResponse.json({ success: true });
}
