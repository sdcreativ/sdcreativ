import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getCalendarEventById } from "@/lib/calendar";
import { listEventParticipants } from "@/lib/calendar-participants";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const event = await getCalendarEventById(id);
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });

    const participants = await listEventParticipants(id);
    return NextResponse.json({ participants });
  } catch (error) {
    console.error("[api/admin/calendar/events/participants] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
