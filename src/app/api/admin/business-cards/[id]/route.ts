import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import { getBusinessCardById, getBusinessCardStats, updateBusinessCard } from "@/lib/business-cards";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { roleHasPermission } from "@/lib/crm-permissions";
import { businessCardFieldsSchema } from "@/lib/validations/business-card";

type Params = { params: Promise<{ id: string }> };

function disabled() {
  return NextResponse.json({ error: "Module cartes de visite désactivé." }, { status: 404 });
}

export async function GET(_request: Request, { params }: Params) {
  if (!isBusinessCardsEnabled()) return disabled();
  const authError = await crmApiAuth.session();
  if (authError) return authError;
  const session = await getAdminSession();
  if (!session || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte requis." }, { status: 403 });
  }

  const { id } = await params;
  const card = await getBusinessCardById(id);
  if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

  const canRead =
    card.userId === session.userId || roleHasPermission(session.role, "cards.read");
  if (!canRead) return NextResponse.json({ error: "Permissions insuffisantes." }, { status: 403 });

  const stats = await getBusinessCardStats(card.id);
  return NextResponse.json({ card, stats });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!isBusinessCardsEnabled()) return disabled();
  const authError = await crmApiAuth.session();
  if (authError) return authError;
  const session = await getAdminSession();
  if (!session || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte requis." }, { status: 403 });
  }

  const { id } = await params;
  const current = await getBusinessCardById(id);
  if (!current) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

  const canWrite =
    current.userId === session.userId || roleHasPermission(session.role, "cards.write");
  if (!canWrite) return NextResponse.json({ error: "Permissions insuffisantes." }, { status: 403 });

  const parsed = businessCardFieldsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  const card = await updateBusinessCard(id, parsed.data, {
    userId: session.userId,
    name: session.name,
    email: session.email,
  });
  return NextResponse.json({ card });
}
