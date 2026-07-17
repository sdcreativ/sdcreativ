import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteCalendarEvent,
  getCalendarEventById,
  updateCalendarEvent,
  updateEventSchema,
} from "@/lib/calendar";
import { participantSchema, syncEventParticipants } from "@/lib/calendar-participants";
import { sendCalendarInvitations } from "@/lib/calendar-invitations";
import {
  deleteCalendarEventFromOAuthProviders,
  pushCalendarEventToOAuthProviders,
} from "@/lib/calendar-sync";

const patchBodySchema = updateEventSchema.extend({
  participants: z.array(participantSchema).optional(),
  sendInvitations: z.boolean().optional(),
});

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
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (error) {
    console.error("[api/admin/calendar/events/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchBodySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { participants, sendInvitations, ...eventInput } = parsed.data;
    const event = await updateCalendarEvent(id, eventInput);
    if (!event) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }

    const session = await getAdminSession();
    if (session?.userId && session.userId !== "legacy") {
      void pushCalendarEventToOAuthProviders(session.userId, event.id).catch(console.error);
    }

    let invited = { emails: 0, whatsapp: 0 };
    if (participants) {
      const { newParticipants } = await syncEventParticipants(id, participants);
      if (sendInvitations !== false && newParticipants.length > 0) {
        invited = await sendCalendarInvitations(event, newParticipants);
      }
    }

    return NextResponse.json({ event, invited });
  } catch (error) {
    console.error("[api/admin/calendar/events/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const session = await getAdminSession();
    if (session?.userId && session.userId !== "legacy") {
      void deleteCalendarEventFromOAuthProviders(session.userId, id).catch(console.error);
    }

    const deleted = await deleteCalendarEvent(id);
    if (!deleted) {
      return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/calendar/events/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
