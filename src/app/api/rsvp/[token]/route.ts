import { NextResponse } from "next/server";
import { getCalendarEventById } from "@/lib/calendar";
import {
  getEventParticipantByEmail,
  rsvpStatusSchema,
  setParticipantRsvpStatus,
  RSVP_STATUS_LABELS,
} from "@/lib/calendar-participants";
import { verifyCalendarRsvpToken } from "@/lib/calendar-rsvp-token";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCalendarDateTime } from "@/content/calendar-labels";

type Props = { params: Promise<{ token: string }> };

function decodeTokenParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function loadRsvpContext(token: string) {
  const verified = verifyCalendarRsvpToken(token);
  if (!verified) return { error: "Lien invalide ou expiré." as const, status: 400 as const };

  const event = await getCalendarEventById(verified.eventId);
  if (!event) return { error: "Événement introuvable." as const, status: 404 as const };

  const participant = await getEventParticipantByEmail(verified.eventId, verified.email);
  if (!participant) {
    return {
      error: "Vous n’êtes plus sur la liste des participants." as const,
      status: 404 as const,
    };
  }

  return { verified, event, participant };
}

/** Détail public RSVP (sans auth). */
export async function GET(_request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token: raw } = await params;
    const ctx = await loadRsvpContext(decodeTokenParam(raw));
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    return NextResponse.json({
      event: {
        id: ctx.event.id,
        title: ctx.event.title,
        startsAt: ctx.event.startsAt,
        allDay: ctx.event.allDay,
        when: formatCalendarDateTime(ctx.event.startsAt, ctx.event.allDay),
        meetingUrl: ctx.event.meetingUrl,
      },
      participant: {
        email: ctx.participant.email,
        name: ctx.participant.name,
        status: ctx.participant.status,
        statusLabel: RSVP_STATUS_LABELS[ctx.participant.status],
        respondedAt: ctx.participant.respondedAt,
      },
    });
  } catch (error) {
    console.error("[api/rsvp] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Enregistre une réponse RSVP. */
export async function POST(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token: raw } = await params;
    const ctx = await loadRsvpContext(decodeTokenParam(raw));
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    const parsed = rsvpStatusSchema.safeParse(body?.status);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Statut invalide (accepted, declined ou tentative)." },
        { status: 400 },
      );
    }

    const updated = await setParticipantRsvpStatus(
      ctx.verified.eventId,
      ctx.verified.email,
      parsed.data,
    );
    if (!updated) {
      return NextResponse.json({ error: "Participant introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      participant: {
        email: updated.email,
        name: updated.name,
        status: updated.status,
        statusLabel: RSVP_STATUS_LABELS[updated.status],
        respondedAt: updated.respondedAt,
      },
    });
  } catch (error) {
    console.error("[api/rsvp] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
