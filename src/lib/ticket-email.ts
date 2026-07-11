import type { Ticket, TicketMessage } from "@/lib/tickets";
import { TICKET_CATEGORY_LABELS, formatTicketDate } from "@/content/tickets-labels";
import { escapeHtml } from "@/lib/email";

export function buildTicketClientMessageAdminEmailHtml(
  ticket: Ticket,
  message: TicketMessage,
  siteUrl: string,
): string {
  const adminUrl = `${siteUrl}/admin/crm/tickets?ref=${encodeURIComponent(ticket.reference)}`;
  const preview =
    message.content.length > 500 ? `${message.content.slice(0, 500)}…` : message.content;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p><strong>Nouveau message client</strong></p>
    <p><strong>${escapeHtml(ticket.clientName)}</strong> a répondu sur le ticket <strong>${escapeHtml(ticket.reference)}</strong>.</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">${escapeHtml(ticket.reference)} — ${escapeHtml(ticket.subject)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Catégorie : ${escapeHtml(TICKET_CATEGORY_LABELS[ticket.category])}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280">${formatTicketDate(message.createdAt)}</p>
      <div style="padding:12px;background:#fff;border-radius:8px;border:1px solid #e5e7eb">
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(preview)}</p>
      </div>
    </div>
    <p><a href="${escapeHtml(adminUrl)}" style="color:#1e40af">Ouvrir le ticket dans le CRM</a></p>
  </div>`;
}

export function buildTicketCreatedAdminEmailHtml(
  ticket: Ticket,
  initialMessage: string,
  siteUrl: string,
): string {
  const adminUrl = `${siteUrl}/admin/crm/tickets?ref=${encodeURIComponent(ticket.reference)}`;
  const preview =
    initialMessage.length > 500 ? `${initialMessage.slice(0, 500)}…` : initialMessage;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p><strong>Nouveau ticket client</strong></p>
    <p><strong>${escapeHtml(ticket.clientName)}</strong> a ouvert un ticket de support.</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">${escapeHtml(ticket.reference)} — ${escapeHtml(ticket.subject)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Catégorie : ${escapeHtml(TICKET_CATEGORY_LABELS[ticket.category])}</p>
      <div style="margin-top:12px;padding:12px;background:#fff;border-radius:8px;border:1px solid #e5e7eb">
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(preview)}</p>
      </div>
    </div>
    <p><a href="${escapeHtml(adminUrl)}" style="color:#1e40af">Ouvrir le ticket dans le CRM</a></p>
  </div>`;
}

export function buildTicketReplyEmailHtml(
  ticket: Ticket,
  message: TicketMessage,
  siteUrl: string,
): string {
  const portalUrl = `${siteUrl}/espace-client`;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p>Bonjour ${escapeHtml(ticket.clientName.split(" ")[0] ?? ticket.clientName)},</p>
    <p>Notre équipe a répondu à votre ticket de support <strong>${escapeHtml(ticket.reference)}</strong>.</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">${escapeHtml(ticket.reference)} — ${escapeHtml(ticket.subject)}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Catégorie : ${escapeHtml(TICKET_CATEGORY_LABELS[ticket.category])}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280">Répondu le ${formatTicketDate(message.createdAt)}</p>
      <div style="padding:12px;background:#fff;border-radius:8px;border:1px solid #e5e7eb">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#374151">${escapeHtml(message.authorName)}</p>
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(message.content)}</p>
      </div>
    </div>
    <p>Vous pouvez consulter la conversation complète et répondre depuis votre espace client :</p>
    <p><a href="${escapeHtml(portalUrl)}" style="color:#1e40af">Accéder à l'espace client</a></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#9ca3af">SD CREATIV — ${escapeHtml(siteUrl)}</p>
  </div>`;
}
