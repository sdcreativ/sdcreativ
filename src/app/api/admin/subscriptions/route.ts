import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createSubscription,
  createSubscriptionSchema,
  listSubscriptions,
} from "@/lib/subscriptions";

export async function GET(request: Request) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const subscriptions = await listSubscriptions({ clientId });
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("[api/admin/subscriptions] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const subscription = await createSubscription(parsed.data);
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/subscriptions] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
