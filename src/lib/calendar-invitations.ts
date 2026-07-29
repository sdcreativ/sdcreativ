import type { CalendarEvent } from "@/lib/calendar";
import { buildSingleEventIcs } from "@/lib/calendar-ical";
import { resolveCalendarNotifyEmail } from "@/lib/calendar-notify-email";
import type { ParticipantInput } from "@/lib/calendar-participants";
import { MEETING_PLATFORM_LABELS } from "@/content/calendar-labels";
import { formatCalendarDateTime } from "@/content/calendar-labels";
import { EVENT_TYPE_LABELS } from "@/content/calendar-labels";
import { withDb } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { isWhatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { resolveWhatsappDigits } from "@/lib/site-public-resolver";
import { stripHtml } from "@/lib/blog-content";
import { sanitizeMailHtml } from "@/lib/mail/sanitize-html";
import {
  createCalendarAttachmentAccessUrl,
  loadCalendarAttachmentBuffer,
  type CalendarEventAttachment,
} from "@/lib/calendar-attachments";
import { logCalendarInvitation } from "@/lib/calendar-invitation-logs";
import { buildCalendarRsvpUrl } from "@/lib/calendar-rsvp-token";

type ResolvedParticipant = ParticipantInput & {
  /** Email CRM / DB (clé RSVP). */
  email: string;
  /** Destinataire réel (souvent email perso). */
  notifyEmail: string;
};

/** Remappe les participants équipe vers leur email personnel si disponible. */
async function resolveParticipantsForNotify(
  participants: ParticipantInput[],
): Promise<ResolvedParticipant[]> {
  if (participants.length === 0) return [];

  const emails = participants.map((p) => p.email.toLowerCase());
  const teamMap = await withDb(async (query) => {
    const { rows } = await query<{
      email: string;
      personal_email: string | null;
      name: string;
    }>(
      `SELECT email, personal_email, name FROM crm_users
       WHERE active = true
         AND (
           LOWER(email) = ANY($1::text[])
           OR LOWER(COALESCE(personal_email, '')) = ANY($1::text[])
         )`,
      [emails],
    );
    const map = new Map<string, { email: string; personalEmail: string | null; name: string }>();
    for (const row of rows) {
      const notify = resolveCalendarNotifyEmail({
        professionalEmail: row.email,
        personalEmail: row.personal_email,
      });
      const entry = {
        email: notify,
        personalEmail: row.personal_email,
        name: row.name,
      };
      map.set(row.email.toLowerCase(), entry);
      if (row.personal_email) {
        map.set(row.personal_email.toLowerCase(), entry);
      }
    }
    return map;
  });

  return participants.map((p) => {
    const hit = teamMap.get(p.email.toLowerCase());
    if (!hit) {
      return { ...p, email: p.email.toLowerCase(), notifyEmail: p.email.toLowerCase() };
    }
    return {
      ...p,
      email: p.email.toLowerCase(),
      name: p.name ?? hit.name,
      notifyEmail: hit.email,
    };
  });
}

async function resolveMeetingUrl(event: CalendarEvent): Promise<string | null> {
  if (event.meetingUrl) return event.meetingUrl;
  if (event.meetingPlatform === "whatsapp") {
    const { contact } = await getSitePublicSettings();
    const digits = resolveWhatsappDigits(contact);
    if (!digits) return null;
    const text = `Réunion SD CREATIV — ${event.title} — ${formatCalendarDateTime(event.startsAt, event.allDay)}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  return null;
}

function eventAttachments(event: CalendarEvent): CalendarEventAttachment[] {
  if (event.attachments?.length) return event.attachments;
  return event.attachment ? [event.attachment] : [];
}

function buildAttachmentsHtml(
  files: CalendarEventAttachment[],
  urls: Array<string | null>,
): string {
  if (files.length === 0) return "";
  const items = files
    .map((file, i) => {
      const url = urls[i];
      const label = escapeHtml(file.name);
      return url
        ? `<li><a href="${escapeHtml(url)}" style="color:#2563eb">${label}</a></li>`
        : `<li>${label}</li>`;
    })
    .join("");
  const title = files.length > 1 ? "Pièces jointes" : "Pièce jointe";
  return `<div style="margin:8px 0 0"><strong>${title} :</strong> (également jointes à cet e-mail)<ul style="margin:4px 0 0;padding-left:18px">${items}</ul></div>`;
}

function buildRsvpButtonsHtml(rsvpUrl: string): string {
  const accept = `${rsvpUrl}?status=accepted`;
  const tentative = `${rsvpUrl}?status=tentative`;
  const decline = `${rsvpUrl}?status=declined`;
  const btn =
    "display:inline-block;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:4px";
  return `<div style="margin:20px 0 8px">
    <p style="margin:0 0 10px;font-weight:600">Votre réponse :</p>
    <a href="${escapeHtml(accept)}" style="${btn};background:#059669;color:#fff">Accepter</a>
    <a href="${escapeHtml(tentative)}" style="${btn};background:#d97706;color:#fff">Peut-être</a>
    <a href="${escapeHtml(decline)}" style="${btn};background:#dc2626;color:#fff">Refuser</a>
  </div>
  <p style="margin:0;font-size:12px;color:#6b7280">Ou ouvrez <a href="${escapeHtml(rsvpUrl)}" style="color:#2563eb">la page de réponse</a>.</p>`;
}

function buildInvitationHtml(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
  attachmentUrls: Array<string | null>,
  rsvpUrl: string,
): string {
  const platformLabel = event.meetingPlatform
    ? MEETING_PLATFORM_LABELS[event.meetingPlatform]
    : null;
  const files = eventAttachments(event);

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p>Bonjour ${escapeHtml(participantName)},</p>
    <p>Vous êtes invité(e) à l'événement suivant :</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:16px;font-weight:700">${escapeHtml(event.title)}</p>
      <p style="margin:0 0 4px"><strong>Type :</strong> ${escapeHtml(EVENT_TYPE_LABELS[event.type])}</p>
      <p style="margin:0 0 4px"><strong>Date :</strong> ${formatCalendarDateTime(event.startsAt, event.allDay)}</p>
      ${platformLabel && event.meetingPlatform !== "none" ? `<p style="margin:0 0 4px"><strong>Canal :</strong> ${escapeHtml(platformLabel)}</p>` : ""}
      ${meetingUrl ? `<p style="margin:8px 0 0"><a href="${escapeHtml(meetingUrl)}" style="color:#2563eb;font-weight:600">Rejoindre la réunion</a></p>` : ""}
      ${event.description ? `<div style="margin:8px 0 0">${sanitizeMailHtml(event.description)}</div>` : ""}
      ${buildAttachmentsHtml(files, attachmentUrls)}
    </div>
    ${buildRsvpButtonsHtml(rsvpUrl)}
    <p style="margin-top:16px">Un fichier calendrier (.ics) est joint pour ajouter l'événement à votre agenda.</p>
  </div>`;
}

function invitationTemplateVars(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
  attachmentUrls: Array<string | null>,
  rsvpUrl: string,
): Record<string, string> {
  const platformLabel =
    event.meetingPlatform && event.meetingPlatform !== "none"
      ? MEETING_PLATFORM_LABELS[event.meetingPlatform]
      : "";
  const files = eventAttachments(event);
  const greeting = participantName.split(" ")[0] ?? participantName;

  return {
    name: escapeHtml(greeting),
    title: escapeHtml(event.title),
    type: escapeHtml(EVENT_TYPE_LABELS[event.type]),
    date: escapeHtml(formatCalendarDateTime(event.startsAt, event.allDay)),
    platform: escapeHtml(platformLabel),
    platformBlock: platformLabel
      ? `<p style="margin:0 0 4px"><strong>Canal :</strong> ${escapeHtml(platformLabel)}</p>`
      : "",
    platformLine: platformLabel ? `Canal : ${platformLabel}` : "",
    meetingUrl: meetingUrl ? escapeHtml(meetingUrl) : "",
    meetingUrlLine: meetingUrl ? `Lien : ${meetingUrl}` : "",
    meetingLink: meetingUrl
      ? `<p style="margin:8px 0 0"><a href="${escapeHtml(meetingUrl)}" style="color:#2563eb;font-weight:600">Rejoindre la réunion</a></p>`
      : "",
    description: event.description
      ? `<div style="margin:8px 0 0">${sanitizeMailHtml(event.description)}</div>`
      : "",
    descriptionText: event.description ? stripHtml(event.description).slice(0, 400) : "",
    attachments: buildAttachmentsHtml(files, attachmentUrls),
    attachmentsText: files
      .map((file, i) => {
        const url = attachmentUrls[i];
        return url ? `Pièce jointe : ${url}` : `Pièce jointe : ${file.name}`;
      })
      .join("\n"),
    rsvpButtons: buildRsvpButtonsHtml(rsvpUrl),
    rsvpUrl,
  };
}

async function renderInvitationEmail(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
  attachmentUrls: Array<string | null>,
  rsvpUrl: string,
): Promise<{
  subject: string;
  html: string;
  logoAttachment: { filename: string; content: Buffer; contentId: string } | null;
}> {
  const vars = invitationTemplateVars(
    event,
    participantName,
    meetingUrl,
    attachmentUrls,
    rsvpUrl,
  );
  try {
    const { getCrmSettings, renderEmailTemplate } = await import("@/lib/crm-settings");
    const { getEmailLogoTemplateVars } = await import("@/lib/email-logo");
    const [settings, logoVars] = await Promise.all([
      getCrmSettings(),
      getEmailLogoTemplateVars(),
    ]);
    const template = settings.emailTemplates.calendar_invitation;
    if (template?.htmlBody) {
      const rendered = renderEmailTemplate(template, settings.branding, {
        ...vars,
        logo: logoVars.logo,
        logoUrl: logoVars.logoUrl,
      });
      return {
        ...rendered,
        logoAttachment: logoVars.logoAttachment,
      };
    }
  } catch (error) {
    console.error("[calendar-invitations] template render fallback", error);
  }
  return {
    subject: `Invitation — ${event.title}`,
    html: buildInvitationHtml(event, participantName, meetingUrl, attachmentUrls, rsvpUrl),
    logoAttachment: null,
  };
}

async function renderInvitationWhatsApp(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
  attachmentUrls: Array<string | null>,
  rsvpUrl: string,
): Promise<string> {
  const vars = invitationTemplateVars(
    event,
    participantName,
    meetingUrl,
    attachmentUrls,
    rsvpUrl,
  );
  // WhatsApp : pas d’HTML échappé dans le texte
  const plainVars: Record<string, string> = {
    ...vars,
    name: participantName.split(" ")[0] ?? participantName,
    title: event.title,
    type: EVENT_TYPE_LABELS[event.type],
    date: formatCalendarDateTime(event.startsAt, event.allDay),
    meetingUrl: meetingUrl ?? "",
  };
  try {
    const { getCrmSettings, renderEmailTemplate } = await import("@/lib/crm-settings");
    const settings = await getCrmSettings();
    const template = settings.emailTemplates.calendar_invitation_whatsapp;
    if (template?.htmlBody) {
      const { html } = renderEmailTemplate(template, settings.branding, plainVars);
      return html.replace(/<[^>]+>/g, "").trim() || html.trim();
    }
  } catch (error) {
    console.error("[calendar-invitations] whatsapp template fallback", error);
  }
  return buildWhatsAppBody(event, participantName, meetingUrl, attachmentUrls, rsvpUrl);
}

function buildWhatsAppBody(
  event: CalendarEvent,
  participantName: string,
  meetingUrl: string | null,
  attachmentUrls: Array<string | null>,
  rsvpUrl: string,
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
  if (event.description) lines.push("", stripHtml(event.description).slice(0, 400));
  const files = eventAttachments(event);
  for (let i = 0; i < files.length; i++) {
    const url = attachmentUrls[i];
    lines.push(url ? `Pièce jointe : ${url}` : `Pièce jointe : ${files[i]!.name}`);
  }
  lines.push("", `Répondre (RSVP) : ${rsvpUrl}`);
  return lines.join("\n");
}

async function prepareAttachmentPayload(event: CalendarEvent): Promise<{
  urls: Array<string | null>;
  mailFiles: Array<{ filename: string; content: Buffer }>;
}> {
  const files = eventAttachments(event);
  const urls: Array<string | null> = [];
  const mailFiles: Array<{ filename: string; content: Buffer }> = [];

  for (const file of files) {
    const url = await createCalendarAttachmentAccessUrl(file);
    urls.push(url);
    const buffer = await loadCalendarAttachmentBuffer(file);
    if (buffer && buffer.length > 0) {
      mailFiles.push({ filename: file.name, content: buffer });
    }
  }

  return { urls, mailFiles };
}

export async function sendCalendarInvitationEmail(
  event: CalendarEvent,
  participant: ResolvedParticipant | ParticipantInput,
  preparedAttachments?: Awaited<ReturnType<typeof prepareAttachmentPayload>>,
): Promise<{ ok: boolean; error?: string; providerMessageId?: string | null }> {
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const dbEmail = participant.email.toLowerCase();
  const notifyEmail =
    "notifyEmail" in participant && participant.notifyEmail
      ? participant.notifyEmail
      : dbEmail;
  const greeting = participant.name?.split(" ")[0] ?? dbEmail.split("@")[0] ?? "Bonjour";
  const meetingUrl = await resolveMeetingUrl(event);
  const rsvpUrl = buildCalendarRsvpUrl(event.id, dbEmail);
  const ics = buildSingleEventIcs({
    id: event.id,
    title: event.title,
    description: event.description ? stripHtml(event.description) : null,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    meetingUrl,
    organizerEmail: fromEmail,
    attendee: {
      email: notifyEmail,
      name: participant.name,
      status: "pending",
    },
  });

  const { urls, mailFiles } =
    preparedAttachments ?? (await prepareAttachmentPayload(event));

  const { validateCalendarMailAttachments } = await import("@/lib/calendar-mail-limits");
  const sizeCheck = validateCalendarMailAttachments(
    mailFiles.map((f) => ({ name: f.filename, size: f.content.byteLength })),
  );
  if (!sizeCheck.ok) {
    return { ok: false, error: sizeCheck.error };
  }

  const mailAttachments: Array<{ filename: string; content: Buffer }> = [
    {
      filename: "invitation-sdcreativ.ics",
      content: Buffer.from(ics, "utf-8"),
    },
    ...mailFiles,
  ];

  const { sendEmailDetailed } = await import("@/lib/email");
  const rendered = await renderInvitationEmail(
    event,
    greeting,
    meetingUrl,
    urls,
    rsvpUrl,
  );
  const result = await sendEmailDetailed({
    to: notifyEmail,
    subject: rendered.subject,
    html: rendered.html,
    replyTo: fromEmail,
    attachments: [
      ...(rendered.logoAttachment
        ? [
            {
              filename: rendered.logoAttachment.filename,
              content: rendered.logoAttachment.content,
              contentId: rendered.logoAttachment.contentId,
            },
          ]
        : []),
      ...mailAttachments,
    ],
  });

  if (!result.ok) {
    console.error("[calendar-invitations] envoi échoué", {
      to: notifyEmail,
      error: result.error,
    });
    return { ok: false, error: result.error };
  }
  return { ok: true, providerMessageId: result.id ?? null };
}

export async function sendCalendarInvitations(
  event: CalendarEvent,
  participants: ParticipantInput[],
): Promise<{ emails: number; whatsapp: number; errors: string[] }> {
  const meetingUrl = await resolveMeetingUrl(event);
  const preparedAttachments = await prepareAttachmentPayload(event);
  const resolved = await resolveParticipantsForNotify(participants);
  let emails = 0;
  let whatsapp = 0;
  const errors: string[] = [];

  for (const participant of resolved) {
    const result = await sendCalendarInvitationEmail(
      event,
      participant,
      preparedAttachments,
    );
    if (result.ok) {
      emails += 1;
      await logCalendarInvitation({
        eventId: event.id,
        email: participant.notifyEmail,
        channel: "email",
        status: "sent",
        providerMessageId: result.providerMessageId,
      }).catch((err) => console.error("[calendar-invitations] log sent", err));
    } else {
      if (result.error) {
        errors.push(`${participant.notifyEmail}: ${result.error}`);
      }
      await logCalendarInvitation({
        eventId: event.id,
        email: participant.notifyEmail,
        channel: "email",
        status: "failed",
        error: result.error ?? "Échec envoi",
      }).catch((err) => console.error("[calendar-invitations] log failed", err));
    }

    const shouldWhatsApp =
      participant.phone &&
      isWhatsAppConfigured() &&
      event.meetingPlatform === "whatsapp";

    if (shouldWhatsApp && participant.phone) {
      const name = participant.name ?? participant.notifyEmail;
      const rsvpUrl = buildCalendarRsvpUrl(event.id, participant.email);
      const body = await renderInvitationWhatsApp(
        event,
        name,
        meetingUrl,
        preparedAttachments.urls,
        rsvpUrl,
      );
      const sent = await sendWhatsApp(participant.phone, body);
      if (sent) {
        whatsapp += 1;
        await logCalendarInvitation({
          eventId: event.id,
          email: participant.notifyEmail,
          channel: "whatsapp",
          status: "sent",
        }).catch((err) => console.error("[calendar-invitations] log wa sent", err));
      } else {
        await logCalendarInvitation({
          eventId: event.id,
          email: participant.notifyEmail,
          channel: "whatsapp",
          status: "failed",
          error: "WhatsApp non envoyé",
        }).catch((err) => console.error("[calendar-invitations] log wa failed", err));
      }
    }
  }

  return { emails, whatsapp, errors };
}
