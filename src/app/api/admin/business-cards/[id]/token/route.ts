import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { regenerateBusinessCardToken } from "@/lib/business-cards";
import { crmApiAuth } from "@/lib/crm-api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  if (!isBusinessCardsEnabled()) {
    return NextResponse.json({ error: "Module cartes de visite désactivé." }, { status: 404 });
  }
  const authError = await crmApiAuth.cards.write();
  if (authError) return authError;
  const session = await getAdminSession();
  if (!session || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte requis." }, { status: 403 });
  }

  const { id } = await params;
  const card = await regenerateBusinessCardToken(id, {
    userId: session.userId,
    name: session.name,
    email: session.email,
  });
  if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  return NextResponse.json({ card });
}
