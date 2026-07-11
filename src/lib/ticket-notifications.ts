import type { Ticket, TicketMessage } from "@/lib/tickets";
import {
  buildTicketClientMessageAdminEmailHtml,
  buildTicketCreatedAdminEmailHtml,
  buildTicketReplyEmailHtml,
} from "@/lib/ticket-email";
import { sendEmail } from "@/lib/email";
import { createAdminTicketNotification } from "@/lib/billing/notifications";

function adminRecipients(): string[] {
  const raw = process.env.CONTACT_TO_EMAIL ?? process.env.CRM_BOOTSTRAP_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function ticketAdminLink(ticket: Ticket): string {
  return `/admin/crm/tickets?ref=${encodeURIComponent(ticket.reference)}`;
}

export async function notifyAdminOfClientTicketMessage(
  ticket: Ticket,
  message: TicketMessage,
): Promise<void> {
  if (message.authorType !== "client") return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const preview =
    message.content.length > 120 ? `${message.content.slice(0, 120)}…` : message.content;

  await createAdminTicketNotification({
    eventType: "ticket.client_message",
    title: `Message client — ${ticket.reference}`,
    message: `${ticket.clientName} : ${preview}`,
    linkHref: ticketAdminLink(ticket),
    entityType: "ticket",
    entityId: ticket.id,
  });

  const recipients = adminRecipients();
  if (recipients.length === 0) return;

  await sendEmail({
    to: recipients,
    subject: `[CRM] Message client — ${ticket.reference} — ${ticket.subject}`,
    html: buildTicketClientMessageAdminEmailHtml(ticket, message, siteUrl),
  });
}

export async function notifyAdminOfClientTicketCreated(
  ticket: Ticket,
  initialMessage: string,
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const preview =
    initialMessage.length > 120 ? `${initialMessage.slice(0, 120)}…` : initialMessage;

  await createAdminTicketNotification({
    eventType: "ticket.created",
    title: `Nouveau ticket — ${ticket.reference}`,
    message: `${ticket.clientName} : ${preview}`,
    linkHref: ticketAdminLink(ticket),
    entityType: "ticket",
    entityId: ticket.id,
  });

  const recipients = adminRecipients();
  if (recipients.length === 0) return;

  await sendEmail({
    to: recipients,
    subject: `[CRM] Nouveau ticket — ${ticket.reference} — ${ticket.subject}`,
    html: buildTicketCreatedAdminEmailHtml(ticket, initialMessage, siteUrl),
  });
}

export async function notifyTicketClientOfReply(
  ticket: Ticket,
  message: TicketMessage,
): Promise<boolean> {
  if (message.authorType !== "staff") return false;
  if (!ticket.clientEmail?.trim()) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";

  return sendEmail({
    to: ticket.clientEmail,
    subject: `Réponse à votre ticket ${ticket.reference} — ${ticket.subject}`,
    html: buildTicketReplyEmailHtml(ticket, message, siteUrl),
    replyTo: fromEmail,
  });
}
