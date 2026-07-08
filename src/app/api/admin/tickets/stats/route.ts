import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getTicketStats } from "@/lib/tickets";

export async function GET() {
  const authError = await crmApiAuth.tickets.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const stats = await getTicketStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[api/admin/tickets/stats] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
