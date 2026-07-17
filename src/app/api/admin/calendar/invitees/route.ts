import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listCalendarInvitees } from "@/lib/calendar-invitees";

export async function GET() {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const invitees = await listCalendarInvitees();
    return NextResponse.json({ invitees });
  } catch (error) {
    console.error("[api/admin/calendar/invitees] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
