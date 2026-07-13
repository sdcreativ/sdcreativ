import type { CalendarEvent } from "@/lib/calendar";
import { buildSingleEventIcs } from "@/lib/calendar-ical";
import type { ParticipantInput } from "@/lib/calendar-participants";
import { MEETING_PLATFORM_LABELS } from "@/content/calendar-labels";
import { formatCalendarDateTime } from "@/content/calendar-labels";
import { EVENT_TYPE_LABELS } from "@/content/calendar-labels";
import { escapeHtml } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import { isWhatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";
import { CONTACT } from "@/lib/constants";

function resolveMeetingUrl(event: CalendarEvent): string | null {
  if (event.meetingUrl) return event.meetingUrl;
  if (event.meetingPlatform === "whatsapp" && CONTACT.whatsapp) {
    const text = `Réunion SD CREATIV — ${event.title} — ${formatCalendarDateTime(event.startsAt, event.allDay)}`;
    return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
  }
  return null;
}

function buildInvitationHtml(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const platformLabel = event.meetingPlatform
    ? MEETING_PLATFORM_LABELS[event.meetingPlatform]
    : null;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p>Bonjour ${escapeHtml(participantName)},</p>
    <p>Vous êtes invité(e) à l'événement suivant :</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700">${escapeHtml(event.title)}</p>
      <p style="margin:0 0 4px"><strong>Type :</strong> ${escapeHtml(EVENT_TYPE_LABELS[event.type])}</p>
      <p style="margin:0 0 4px"><strong>Date :</strong> ${formatCalendarDateTime(event.startsAt, event.allDay)}</p>
      ${platformLabel && event.meetingPlatform !== "none" ? `<p style="margin:0 0 4px"><strong>Canal :</strong> ${escapeHtml(platformLabel)}</p>` : ""}
      ${meetingUrl ? `<p style="margin:8px 0 0"><a href="${escapeHtml(meetingUrl)}" style="color:#2563eb;font-weight:600">Rejoindre la réunion</a></p>` : ""}
      ${event.description ? `<p style="margin:8px 0 0">${escapeHtml(event.description)}</p>` : ""}
    </div>
    <p>Un fichier calendrier (.ics) est joint pour ajouter l'événement à votre agenda.</p>
    <p style="font-size:12px;color:#9ca3af">SD CREATIV — ${escapeHtml(siteUrl)}</p>
  </div>`;
}

function buildWhatsAppBody(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
): string {
  const lines = [
    `Bonjour ${participantName.split(" ")[0] ?? participantName},`,
    "",
    `Invitation SD CREATIV : ${event.title}`,
    `Date : ${formatCalendarDateTime(event.startsAt, event.allDay)}`,
  ];
  if (event.meetingPlatform && event.meetingPlatform !== "none") {
    lines.push(`Canal : ${MEETING_PLATFORM_LABELS[event.meetingPlatform]}`);
  }
  if (meetingUrl) lines.push(`Lien : ${meetingUrl}`);
  if (event.description) lines.push("", event.description.slice(0, 400));
  return lines.join("\n");
}

export async function sendCalendarInvitationEmail(
  event: CalendarEvent,
  participant: ParticipantInput,
): Promise<boolean> {
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const greeting = participant.name?.split(" ")[0] ?? participant.email.split("@")[0] ?? "Bonjour";
  const meetingUrl = resolveMeetingUrl(event);
  const ics = buildSingleEventIcs({
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    meetingUrl,
  });

  return sendEmail({
    to: participant.email,
    subject: `Invitation — ${event.title}`,
    html: buildInvitationHtml(event, greeting, meetingUrl),
    replyTo: fromEmail,
    attachments: [
      {
        filename: "invitation-sdcreativ.ics",
        content: Buffer.from(ics, "utf-8"),
      },
    ],
  });
}

export async function sendCalendarInvitations(
  event: CalendarEvent,
  participants: ParticipantInput[],
): Promise<{ emails: number; whatsapp: number }> {
  const meetingUrl = resolveMeetingUrl(event);
  let emails = 0;
  let whatsapp = 0;

  for (const participant of participants) {
    const ok = await sendCalendarInvitationEmail(event, participant);
    if (ok) emails += 1;

    const shouldWhatsApp =
      participant.phone &&
      isWhatsAppConfigured() &&
      event.meetingPlatform === "whatsapp";

    if (shouldWhatsApp && participant.phone) {
      const name = participant.name ?? participant.email;
      const sent = await sendWhatsApp(
        participant.phone,
        buildWhatsAppBody(event, name, meetingUrl),
      );
      if (sent) whatsapp += 1;
    }
  }

  return { emails, whatsapp };
}
