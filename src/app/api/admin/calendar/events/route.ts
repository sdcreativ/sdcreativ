import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createCalendarEvent, createEventSchema } from "@/lib/calendar";
import { participantSchema, syncEventParticipants } from "@/lib/calendar-participants";
import { sendCalendarInvitations } from "@/lib/calendar-invitations";
import { pushCalendarEventToOAuthProviders } from "@/lib/calendar-sync";

const createBodySchema = createEventSchema.extend({
  participants: z.array(participantSchema).optional(),
  sendInvitations: z.boolean().optional(),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createBodySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { participants, sendInvitations, ...eventInput } = parsed.data;
    const event = await createCalendarEvent(eventInput);

    const session = await getAdminSession();
    if (session?.userId && session.userId !== "legacy") {
      void pushCalendarEventToOAuthProviders(session.userId, event.id).catch(console.error);
    }

    let invited = { emails: 0, whatsapp: 0 };
    if (participants?.length) {
      const { newParticipants } = await syncEventParticipants(event.id, participants);
      if (sendInvitations !== false && newParticipants.length > 0) {
        invited = await sendCalendarInvitations(event, newParticipants);
      }
    }

    return NextResponse.json({ event, invited }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/calendar/events] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
