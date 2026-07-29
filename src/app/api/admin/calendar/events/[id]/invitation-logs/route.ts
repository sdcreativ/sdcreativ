import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listCalendarInvitationLogs } from "@/lib/calendar-invitation-logs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const logs = await listCalendarInvitationLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[api/admin/calendar/events/id/invitation-logs] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
