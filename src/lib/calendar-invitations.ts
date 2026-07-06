import type { CalendarEvent } from "@/lib/calendar";
import { escapeHtml } from "@/lib/email";
import { sendEmail } from "@/lib/email";
import { formatCalendarDateTime } from "@/content/calendar-labels";
import { EVENT_TYPE_LABELS } from "@/content/calendar-labels";

export async function sendCalendarInvitationEmail(
  event: CalendarEvent,
  participantEmail: string,
  participantName?: string | null,
): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const greeting = participantName?.split(" ")[0] ?? participantEmail.split("@")[0] ?? "Bonjour";

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p>Bonjour ${escapeHtml(greeting)},</p>
    <p>Vous êtes invité(e) à l'événement suivant :</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700">${escapeHtml(event.title)}</p>
      <p style="margin:0 0 4px"><strong>Type :</strong> ${escapeHtml(EVENT_TYPE_LABELS[event.type])}</p>
      <p style="margin:0 0 4px"><strong>Date :</strong> ${formatCalendarDateTime(event.startsAt, event.allDay)}</p>
      ${event.description ? `<p style="margin:8px 0 0">${escapeHtml(event.description)}</p>` : ""}
    </div>
    <p>Consultez le calendrier CRM pour plus de détails.</p>
    <p style="font-size:12px;color:#9ca3af">SD CREATIV — ${escapeHtml(siteUrl)}</p>
  </div>`;

  return sendEmail({
    to: participantEmail,
    subject: `Invitation — ${event.title}`,
    html,
    replyTo: fromEmail,
  });
}

export async function sendCalendarInvitations(
  event: CalendarEvent,
  emails: string[],
): Promise<number> {
  let sent = 0;
  for (const email of emails) {
    const ok = await sendCalendarInvitationEmail(event, email);
    if (ok) sent += 1;
  }
  return sent;
}
