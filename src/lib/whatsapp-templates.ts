import { withDb } from "@/lib/db";
import { isWhatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";
import { getLeadById } from "@/lib/leads";

export type WhatsAppLeadTemplate = {
  id: string;
  name: string;
  description: string;
  /** Nom du template Meta Cloud API (optionnel). */
  metaTemplateName: string | null;
  language: string;
  /** Corps texte (fallback Twilio / console) — placeholders {{name}}, {{company}}, {{reference}}. */
  body: string;
  leadStatuses: string[];
};

/** Catalogue templates métier liés aux leads (complément 3CX + Twilio). */
export const WHATSAPP_LEAD_TEMPLATES: WhatsAppLeadTemplate[] = [
  {
    id: "lead_welcome",
    name: "Accueil lead",
    description: "Premier contact après prise de lead",
    metaTemplateName: process.env.WHATSAPP_TPL_LEAD_WELCOME?.trim() || null,
    language: "fr",
    body: "Bonjour {{name}}, merci pour votre intérêt pour SD CREATIV. Un conseiller vous recontacte rapidement. — sdcreativ.com",
    leadStatuses: ["new", "contacted"],
  },
  {
    id: "lead_quote_ready",
    name: "Devis prêt",
    description: "Notification qu’un devis est disponible",
    metaTemplateName: process.env.WHATSAPP_TPL_QUOTE_READY?.trim() || null,
    language: "fr",
    body: "Bonjour {{name}}, votre devis {{reference}} est prêt. Consultez-le depuis votre espace client ou répondez à ce message. — SD CREATIV",
    leadStatuses: ["quote_sent", "contacted"],
  },
  {
    id: "lead_followup",
    name: "Relance commerciale",
    description: "Relance douce sans réponse",
    metaTemplateName: process.env.WHATSAPP_TPL_LEAD_FOLLOWUP?.trim() || null,
    language: "fr",
    body: "Bonjour {{name}}, avez-vous pu consulter notre proposition ? Je reste disponible pour en discuter. — SD CREATIV",
    leadStatuses: ["contacted", "quote_sent"],
  },
  {
    id: "lead_meeting",
    name: "Rappel rendez-vous",
    description: "Confirmation / rappel RDV",
    metaTemplateName: process.env.WHATSAPP_TPL_LEAD_MEETING?.trim() || null,
    language: "fr",
    body: "Bonjour {{name}}, petit rappel pour notre échange à venir. À très vite ! — SD CREATIV",
    leadStatuses: ["new", "contacted", "quote_sent"],
  },
];

export function listWhatsAppLeadTemplates(status?: string): WhatsAppLeadTemplate[] {
  if (!status) return WHATSAPP_LEAD_TEMPLATES;
  return WHATSAPP_LEAD_TEMPLATES.filter(
    (t) => t.leadStatuses.length === 0 || t.leadStatuses.includes(status),
  );
}

export function getWhatsAppLeadTemplate(id: string): WhatsAppLeadTemplate | null {
  return WHATSAPP_LEAD_TEMPLATES.find((t) => t.id === id) ?? null;
}

function applyPlaceholders(
  body: string,
  vars: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

async function sendMetaTemplate(input: {
  to: string;
  templateName: string;
  language: string;
  bodyParams: string[];
}): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return false;

  const phone = input.to.replace(/^\+/, "");
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language },
        components:
          input.bodyParams.length > 0
            ? [
                {
                  type: "body",
                  parameters: input.bodyParams.map((text) => ({ type: "text", text })),
                },
              ]
            : undefined,
      },
    }),
  });
  if (!res.ok) {
    console.error("[WhatsApp template Meta]", res.status, await res.text());
    return false;
  }
  return true;
}

export async function sendWhatsAppLeadTemplate(input: {
  leadId: string;
  templateId: string;
  phoneOverride?: string | null;
}): Promise<{ ok: boolean; provider: string; preview: string }> {
  const lead = await getLeadById(input.leadId);
  if (!lead) throw new Error("Lead introuvable.");

  const template = getWhatsAppLeadTemplate(input.templateId);
  if (!template) throw new Error("Template WhatsApp introuvable.");

  const phone = (input.phoneOverride ?? lead.phone)?.trim();
  if (!phone) throw new Error("Aucun numéro WhatsApp sur ce lead.");

  const vars = {
    name: lead.name.split(" ")[0] ?? lead.name,
    company: lead.company ?? "",
    reference: lead.id.slice(0, 8).toUpperCase(),
  };
  const preview = applyPlaceholders(template.body, vars);

  let ok = false;
  let provider = "console";

  if (template.metaTemplateName && process.env.WHATSAPP_API_TOKEN) {
    ok = await sendMetaTemplate({
      to: phone,
      templateName: template.metaTemplateName,
      language: template.language,
      bodyParams: [vars.name, vars.company || vars.reference].filter(Boolean),
    });
    provider = "meta_template";
  }

  if (!ok) {
    ok = await sendWhatsApp(phone, preview);
    provider = isWhatsAppConfigured() ? "text" : "console";
  }

  try {
    await withDb(async (query) => {
      await query(
        `INSERT INTO whatsapp_message_logs (lead_id, template_id, phone, status, provider, payload)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          lead.id,
          template.id,
          phone,
          ok ? "sent" : "failed",
          provider,
          JSON.stringify({ preview, leadStatus: lead.status }),
        ],
      );
    });
  } catch (error) {
    console.warn("[whatsapp-templates] log non persisté (migration 0015 ?)", error);
  }

  return { ok, provider, preview };
}
