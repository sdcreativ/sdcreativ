import type { Ticket, TicketMessage } from "@/lib/tickets";
import { buildTicketReplyEmailHtml } from "@/lib/ticket-email";
import { sendEmail } from "@/lib/email";

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
