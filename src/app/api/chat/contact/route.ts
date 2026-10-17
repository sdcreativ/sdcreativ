import { NextResponse } from "next/server";
import { z } from "zod";
import { createLeadFromConversation } from "@/lib/chat-lead";
import { rejectIfBot } from "@/lib/form-guard";
import { PUBLIC_FORM_RATE_LIMIT, consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

const contactSchema = z.object({
  conversationId: z.string().uuid(),
  firstName: z.string().trim().min(2, "Indiquez votre prénom.").max(80),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 8, "Numéro WhatsApp invalide."),
  email: z.string().trim().email("Adresse e-mail invalide.").max(255),
});

/**
 * « Un conseiller vous recontacte » depuis l'assistante : prospect au CRM avec la conversation et sa provenance,
 * puis alerte à l'équipe. La conversation doit exister (au moins un échange avec l'assistante).
 */
export async function POST(request: Request) {
  try {
    const limited = consumeRateLimit("public-chat-contact", getClientIp(request), PUBLIC_FORM_RATE_LIMIT);
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

    const body = await request.json();
    const rejected = await rejectIfBot(body);
    if (rejected) return rejected;

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const { conversationId, firstName, whatsapp, email } = parsed.data;

    const result = await createLeadFromConversation({ conversationId, name: firstName, email, phone: whatsapp, via: "contact" });
    if (!result.conversationFound) {
      return NextResponse.json({ error: "Conversation introuvable. Posez d'abord votre question." }, { status: 404 });
    }
    if (result.alreadyLinked) return NextResponse.json({ success: true, alreadySent: true });
    if (!result.lead) {
      return NextResponse.json({ error: "Envoi impossible. Écrivez-nous sur WhatsApp." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
