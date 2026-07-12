import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteNewsletterSubscriber,
  listNewsletterSubscribers,
  unsubscribeNewsletterSubscriber,
} from "@/lib/marketing-subscribers";

export async function GET() {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const subscribers = await listNewsletterSubscribers();
    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error("[api/admin/marketing/subscribers] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.leads.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { id?: string; action?: string };
    if (!body.id || !body.action) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    if (body.action === "unsubscribe") {
      await unsubscribeNewsletterSubscriber(body.id);
    } else if (body.action === "delete") {
      await deleteNewsletterSubscriber(body.id);
    } else {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/marketing/subscribers] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
