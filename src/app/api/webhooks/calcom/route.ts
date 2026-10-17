import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createCalendarEvent } from "@/lib/calendar";
import { createLeadFromConversation } from "@/lib/chat-lead";
import { getConversation, markConversationBooked } from "@/lib/chat-conversations";
import { createLeadActivity } from "@/lib/lead-activities";

type CalBooking = {
  title?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  additionalNotes?: string;
  attendees?: Array<{ email?: string; name?: string; phoneNumber?: string }>;
  metadata?: Record<string, unknown>;
  responses?: Record<string, unknown>;
};

/**
 * Cal.com signe le corps (HMAC SHA-256, en-tête X-Cal-Signature-256) avec la clé secrète du webhook.
 * Ancien format accepté : en-tête Authorization: Bearer <secret>.
 */
function isAuthorized(rawBody: string, request: Request, secret: string): boolean {
  const signature = request.headers.get("x-cal-signature-256");
  if (signature) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature.trim().toLowerCase(), "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function responseText(responses: Record<string, unknown> | undefined, key: string): string | null {
  const value = responses?.[key];
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && "value" in value && typeof (value as { value: unknown }).value === "string") {
    return ((value as { value: string }).value).trim() || null;
  }
  return null;
}

/**
 * Webhook Cal.com — rendez-vous réservé : événement dans le calendrier CRM. Réservé depuis le chat de
 * l'assistante (référence de conversation transmise à Cal.com) : rattaché à la conversation et au prospect.
 */
export async function POST(request: Request) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  const rawBody = await request.text();
  if (!secret || !isAuthorized(rawBody, request, secret)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = JSON.parse(rawBody) as CalBooking & { triggerEvent?: string; payload?: CalBooking };
    // Format Cal.com : { triggerEvent, payload: {...} } ; ancien format : champs à plat.
    if (body.triggerEvent && body.triggerEvent !== "BOOKING_CREATED") {
      return NextResponse.json({ ignored: body.triggerEvent });
    }
    const booking: CalBooking = body.payload ?? body;
    if (!booking.title || !booking.startTime) {
      return NextResponse.json({ error: "title et startTime requis." }, { status: 400 });
    }

    const attendee = booking.attendees?.[0];
    const notes = booking.additionalNotes ?? responseText(booking.responses, "notes");
    const conversationId =
      typeof booking.metadata?.chatConversationId === "string" && /^[0-9a-f-]{36}$/i.test(booking.metadata.chatConversationId)
        ? booking.metadata.chatConversationId
        : null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";

    const event = await createCalendarEvent({
      title: `[Cal.com] ${booking.title}`,
      description:
        [
          booking.description,
          notes ? `Notes : ${notes}` : null,
          attendee?.email ? `Contact : ${attendee.name ?? ""} <${attendee.email}>` : null,
          conversationId ? `Conversation avec l'assistante : ${siteUrl}/admin/crm/conversations?id=${conversationId}` : null,
        ]
          .filter(Boolean)
          .join("\n") || null,
      type: "meeting",
      startsAt: booking.startTime,
      endsAt: booking.endTime ?? null,
      allDay: false,
      assignee: null,
    });

    // Réservé depuis le chat : suite de la conversation, prospect créé (ou complété).
    let leadId: string | null = null;
    if (conversationId && (await getConversation(conversationId))) {
      await markConversationBooked(conversationId, booking.startTime);
      const phone = attendee?.phoneNumber ?? responseText(booking.responses, "attendeePhoneNumber") ?? responseText(booking.responses, "phone");
      if (attendee?.email) {
        const result = await createLeadFromConversation({
          conversationId,
          name: attendee.name || attendee.email,
          email: attendee.email,
          phone,
          via: "booking",
          bookingStart: booking.startTime,
        });
        leadId = result.lead?.id ?? null;
        if (result.alreadyLinked) {
          const conversation = await getConversation(conversationId);
          if (conversation?.leadId) {
            leadId = conversation.leadId;
            const when = new Date(booking.startTime).toLocaleString("fr-FR", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "Africa/Abidjan",
            });
            await createLeadActivity({
              leadId,
              type: "note",
              subject: "Rendez-vous réservé",
              content: `Rendez-vous Cal.com réservé depuis le chat : ${when} (heure d'Abidjan).${notes ? `\nNotes : ${notes}` : ""}`,
              actorName: "Cal.com",
            }).catch((error) => console.error("[api/webhooks/calcom] activité", error));
          }
        }
      }
    }

    return NextResponse.json({ event, conversationId, leadId }, { status: 201 });
  } catch (error) {
    console.error("[api/webhooks/calcom] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
