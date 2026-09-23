import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import {
  createBusinessCard,
  getBusinessCardByUserId,
  getBusinessCardStats,
} from "@/lib/business-cards";
import { crmApiAuth } from "@/lib/crm-api-auth";
import type { AuditActor } from "@/lib/crm-audit";

function disabled() {
  return NextResponse.json({ error: "Module cartes de visite désactivé." }, { status: 404 });
}

export async function GET() {
  if (!isBusinessCardsEnabled()) return disabled();
  const authError = await crmApiAuth.session();
  if (authError) return authError;
  const session = await getAdminSession();
  if (!session || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte requis." }, { status: 403 });
  }

  try {
    const card = await getBusinessCardByUserId(session.userId);
    const stats = card ? await getBusinessCardStats(card.id) : null;
    return NextResponse.json({ card, stats });
  } catch (error) {
    console.error("[api/admin/business-cards/mine] GET", error);
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }
}

export async function POST() {
  if (!isBusinessCardsEnabled()) return disabled();
  const authError = await crmApiAuth.session();
  if (authError) return authError;
  const session = await getAdminSession();
  if (!session || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte requis." }, { status: 403 });
  }

  const actor: AuditActor = {
    userId: session.userId,
    name: session.name,
    email: session.email,
  };

  try {
    const existing = await getBusinessCardByUserId(session.userId);
    if (existing) return NextResponse.json({ card: existing });
    const card = await createBusinessCard(session.userId, {}, actor);
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CARD_EXISTS") {
      const card = await getBusinessCardByUserId(session.userId);
      return NextResponse.json({ card });
    }
    console.error("[api/admin/business-cards/mine] POST", error);
    return NextResponse.json({ error: "Création impossible." }, { status: 500 });
  }
}
