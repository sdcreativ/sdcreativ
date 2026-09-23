import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isBusinessCardsEnabled } from "@/lib/business-cards-flag";
import {
  createBusinessCard,
  listBusinessCards,
  listCardCandidates,
} from "@/lib/business-cards";
import { crmApiAuth } from "@/lib/crm-api-auth";
import type { AuditActor } from "@/lib/crm-audit";
import { createBusinessCardSchema } from "@/lib/validations/business-card";

function disabled() {
  return NextResponse.json({ error: "Module cartes de visite désactivé." }, { status: 404 });
}

async function actor(): Promise<AuditActor | null> {
  const session = await getAdminSession();
  if (!session || session.userId === "legacy") return null;
  return { userId: session.userId, name: session.name, email: session.email };
}

export async function GET() {
  if (!isBusinessCardsEnabled()) return disabled();
  const authError = await crmApiAuth.cards.read();
  if (authError) return authError;

  try {
    const [cards, candidates] = await Promise.all([listBusinessCards(), listCardCandidates()]);
    return NextResponse.json({ cards, candidates });
  } catch (error) {
    console.error("[api/admin/business-cards] GET", error);
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isBusinessCardsEnabled()) return disabled();
  const authError = await crmApiAuth.cards.write();
  if (authError) return authError;
  const who = await actor();
  if (!who) return NextResponse.json({ error: "Compte requis." }, { status: 403 });

  try {
    const parsed = createBusinessCardSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const card = await createBusinessCard(parsed.data.userId, parsed.data, who);
    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CARD_EXISTS") {
      return NextResponse.json({ error: "Ce membre a déjà une carte." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }
    console.error("[api/admin/business-cards] POST", error);
    return NextResponse.json({ error: "Création impossible." }, { status: 500 });
  }
}
