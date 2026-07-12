import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getSubscriptionById, updateSubscription, updateSubscriptionSchema } from "@/lib/subscriptions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const subscription = await updateSubscription(id, parsed.data);
    if (!subscription) {
      return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
    }
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("[api/admin/subscriptions/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const subscription = await getSubscriptionById(id);
    if (!subscription) {
      return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
    }
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("[api/admin/subscriptions/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
