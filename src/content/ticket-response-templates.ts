export type TicketResponseTemplate = {
  id: string;
  label: string;
  body: string;
};

export const TICKET_RESPONSE_TEMPLATES: TicketResponseTemplate[] = [
  {
    id: "ack",
    label: "Accusé de réception",
    body: `Bonjour,

Nous avons bien reçu votre demande et notre équipe l'examine. Nous reviendrons vers vous dans les plus brefs délais conformément à notre SLA.

Cordialement,
L'équipe SD CREATIV`,
  },
  {
    id: "info_needed",
    label: "Informations complémentaires",
    body: `Bonjour,

Merci pour votre message. Pour avancer sur votre demande, pourriez-vous nous préciser les éléments suivants :

- 
- 

Dès réception de ces informations, nous reprendrons le traitement de votre ticket.

Cordialement,
L'équipe SD CREATIV`,
  },
  {
    id: "in_progress",
    label: "Prise en charge",
    body: `Bonjour,

Votre ticket est désormais pris en charge par notre équipe technique. Nous vous tiendrons informé(e) de l'avancement.

Cordialement,
L'équipe SD CREATIV`,
  },
  {
    id: "resolved",
    label: "Résolution",
    body: `Bonjour,

Votre demande a été traitée. N'hésitez pas à rouvrir ce ticket ou à nous contacter si vous avez besoin d'un complément.

Merci de votre confiance,
L'équipe SD CREATIV`,
  },
];

export function applyTicketTemplate(
  template: TicketResponseTemplate,
  vars: { clientName?: string; ticketReference?: string; subject?: string },
): string {
  const firstName = vars.clientName?.split(" ")[0] ?? vars.clientName ?? "Bonjour";
  return template.body
    .replace(/^Bonjour,/m, `Bonjour ${firstName},`)
    .replace(/\{reference\}/g, vars.ticketReference ?? "")
    .replace(/\{subject\}/g, vars.subject ?? "");
}
