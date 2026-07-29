import { createCrmNotification } from "@/lib/billing/notifications";
import type { CalendarEvent } from "@/lib/calendar";
import {
  RSVP_STATUS_LABELS,
  type CalendarParticipant,
  type RsvpStatus,
} from "@/lib/calendar-participants";
import { getCrmUserEmailByName } from "@/lib/crm-users";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatCalendarDateTime } from "@/content/calendar-labels";

/** Notifie l’assignee CRM (+ broadcast admin) et envoie un e-mail interne. */
export async function notifyOrganizerOfRsvp(input: {
  event: CalendarEvent;
  participant: CalendarParticipant;
  status: Exclude<RsvpStatus, "pending">;
}): Promise<{ notificationCreated: boolean; emailSent: boolean }> {
  const { event, participant, status } = input;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const linkHref = `${siteUrl.replace(/\/$/, "")}/admin/crm/calendrier`;
  const who = participant.name?.trim() || participant.email;
  const statusLabel = RSVP_STATUS_LABELS[status];
  const title = `RSVP ${statusLabel} — ${event.title}`;
  const message = `${who} a répondu « ${statusLabel} » pour « ${event.title} » (${formatCalendarDateTime(event.startsAt, event.allDay)}).`;

  let notificationCreated = false;
  try {
    await createCrmNotification({
      audience: "admin",
      category: "calendar",
      recipientName: event.assignee?.trim() || null,
      eventType: `rsvp_${status}`,
      title,
      message,
      linkHref,
      entityType: "calendar_event",
      entityId: event.id,
    });
    notificationCreated = true;
  } catch (error) {
    console.error("[calendar-rsvp-notify] notification", error);
  }

  let emailSent = false;
  try {
    const recipients = new Set<string>();
    if (event.assignee?.trim()) {
      const assigneeEmail = await getCrmUserEmailByName(event.assignee);
      if (assigneeEmail) recipients.add(assigneeEmail);
    }
    const fallback = process.env.CONTACT_TO_EMAIL?.trim();
    if (fallback) recipients.add(fallback);

    if (recipients.size > 0) {
      emailSent = await sendEmail({
        to: [...recipients],
        subject: `[CRM] ${title}`,
        html: `<p>${escapeHtml(message)}</p>
          <p><a href="${escapeHtml(linkHref)}">Ouvrir le calendrier</a></p>`,
        replyTo: process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com",
      });
    }
  } catch (error) {
    console.error("[calendar-rsvp-notify] email", error);
  }

  return { notificationCreated, emailSent };
}
