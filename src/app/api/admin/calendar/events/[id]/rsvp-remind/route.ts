import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getCalendarEventById } from "@/lib/calendar";
import { listEventParticipants } from "@/lib/calendar-participants";
import { sendCalendarInvitations } from "@/lib/calendar-invitations";

type Props = { params: Promise<{ id: string }> };

/** Relance RSVP : renvoie l’invitation uniquement aux participants encore « pending ». */
export async function POST(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const event = await getCalendarEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }

    const participants = await listEventParticipants(id);
    const pending = participants.filter((p) => p.status === "pending");
    if (pending.length === 0) {
      return NextResponse.json(
        { error: "Aucun participant en attente de réponse." },
        { status: 400 },
      );
    }

    const invited = await sendCalendarInvitations(
      event,
      pending.map((p) => ({ email: p.email, name: p.name, phone: p.phone })),
    );

    return NextResponse.json({
      invited,
      pendingCount: pending.length,
    });
  } catch (error) {
    console.error("[api/admin/calendar/events/id/rsvp-remind] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
