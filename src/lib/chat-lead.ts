import { CHANNEL_LABELS, leadChannel, type AcquisitionChannel } from "@/lib/attribution";
import { CHAT_INTENT_LABELS } from "@/lib/chat-contact-intent";
import {
  attachLeadToConversation,
  getConversation,
  getConversationMessages,
  visitorTranscript,
} from "@/lib/chat-conversations";
import { escapeHtml, htmlRow, sendEmail } from "@/lib/email";
import { getKadyAppearance } from "@/lib/kady-settings";
import { createLead, type Lead } from "@/lib/leads";

/**
 * Prospect créé à partir d'une conversation avec l'assistante : demande de rappel dans le chat, ou rendez-vous
 * réservé (Cal.com) depuis le chat. Questions posées et provenance jointes ; alerte e-mail à l'équipe.
 */
export async function createLeadFromConversation(input: {
  conversationId: string;
  name: string;
  email: string;
  phone?: string | null;
  via: "contact" | "booking";
  /** Début du rendez-vous réservé (via = booking). */
  bookingStart?: string | null;
}): Promise<{ lead: Lead | null; alreadyLinked: boolean; conversationFound: boolean }> {
  const conversation = await getConversation(input.conversationId);
  if (!conversation) return { lead: null, alreadyLinked: false, conversationFound: false };
  if (conversation.leadId) return { lead: null, alreadyLinked: true, conversationFound: true };

  const [messages, appearance] = await Promise.all([getConversationMessages(input.conversationId), getKadyAppearance()]);
  const assistantName = appearance.name;
  const transcript = visitorTranscript(messages);
  const channel = (conversation.acquisitionChannel ?? leadChannel(conversation.attribution)) as AcquisitionChannel | null;
  const touch = conversation.attribution?.last ?? conversation.attribution?.first;
  const intent =
    input.via === "booking" ? "Rendez-vous réservé" : conversation.intent ? CHAT_INTENT_LABELS[conversation.intent] : null;
  const bookingLabel = input.bookingStart
    ? new Date(input.bookingStart).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Abidjan" })
    : null;

  const lead = await createLead({
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    source: "chat",
    service: intent ?? "Conversation avec l'assistance virtuelle",
    message: [
      bookingLabel ? `Rendez-vous réservé : ${bookingLabel} (heure d'Abidjan).` : null,
      transcript ? `Questions posées à ${assistantName} :\n${transcript}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null,
    metadata: {
      channel: "kady",
      chatConversationId: input.conversationId,
      chatIntent: conversation.intent,
      pagePath: conversation.lastPage,
      ...(input.bookingStart ? { bookingStart: input.bookingStart } : {}),
    },
    attribution: conversation.attribution,
  });
  if (!lead) return { lead: null, alreadyLinked: false, conversationFound: true };
  await attachLeadToConversation(input.conversationId, lead.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  void sendEmail({
    replyTo: input.email,
    subject: `[SD CREATIV] ${intent ? `${intent} — ` : ""}prospect via ${assistantName} : ${input.name}`,
    html: `
      <h2>Nouveau prospect via l'assistance virtuelle</h2>
      ${htmlRow("Nom", input.name)}
      ${htmlRow("WhatsApp / téléphone", input.phone)}
      ${htmlRow("Email", input.email)}
      ${htmlRow("Intention", intent)}
      ${htmlRow("Rendez-vous", bookingLabel ? `${bookingLabel} (heure d'Abidjan)` : null)}
      ${htmlRow("Origine", channel ? (CHANNEL_LABELS[channel] ?? channel) : null)}
      ${htmlRow("Campagne", touch?.campaign)}
      ${htmlRow("Page", conversation.lastPage)}
      ${transcript ? `<p><strong>Questions posées :</strong></p><p>${escapeHtml(transcript).replace(/\n/g, "<br>")}</p>` : ""}
      <p><a href="${siteUrl}/admin/crm/conversations?id=${input.conversationId}">Lire la conversation dans le CRM</a></p>
    `,
  }).catch((error) => console.error("[chat-lead] alerte", error));

  return { lead, alreadyLinked: false, conversationFound: true };
}
