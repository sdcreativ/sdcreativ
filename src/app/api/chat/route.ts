import { NextResponse } from "next/server";
import { getChatResponse } from "@/lib/chat-responder";
import { getKadyAppearance } from "@/lib/kady-settings";
import { getKadyKnowledge } from "@/lib/kady-knowledge";
import { attributionFromBody } from "@/lib/attribution";
import { detectChatIntent } from "@/lib/chat-contact-intent";
import { markContactOffered, recordChatExchange } from "@/lib/chat-conversations";
import { isBotUserAgent } from "@/lib/marketing-events";
import {
  PUBLIC_CHAT_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { isHoneypotTripped } from "@/lib/spam-guard";
import { isEnglishLocaleEnabled } from "@/i18n/config";
import { chatSchema } from "@/lib/validations/chat";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = consumeRateLimit("public-chat", ip, PUBLIC_CHAT_RATE_LIMIT);
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

    const body = await request.json();

    if (isHoneypotTripped(body)) {
      return NextResponse.json({ answer: "Merci pour votre message.", links: [] });
    }

    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Message invalide" },
        { status: 400 },
      );
    }

    const locale =
      isEnglishLocaleEnabled() && parsed.data.locale === "en" ? "en" : "fr";
    const response = await getChatResponse(
      parsed.data.message,
      locale,
      parsed.data.history,
      parsed.data.mode,
      (await getKadyAppearance()).name,
      await getKadyKnowledge(locale),
    );

    // Enregistrement pour l'équipe + proposition « un conseiller vous recontacte » sur intention commerciale.
    const intent = detectChatIntent(parsed.data.message);
    let offerContact = false;
    let messageId: string | undefined;
    if (parsed.data.conversationId && !isBotUserAgent(request.headers.get("user-agent"))) {
      const state = await recordChatExchange({
        conversationId: parsed.data.conversationId,
        locale,
        pagePath: parsed.data.pagePath ?? null,
        attribution: attributionFromBody(body),
        userMessage: parsed.data.message,
        assistantMessage: response.answer,
        answerSource: response.source,
        intent,
      }).catch((error) => {
        console.error("[api/chat] enregistrement", error);
        return null;
      });
      // Une seule proposition par conversation, sauf demande explicite d'un conseiller.
      messageId = state?.assistantMessageId;
      offerContact = Boolean(state && !state.hasLead && intent && (!state.contactOffered || intent === "humain"));
      if (offerContact) await markContactOffered(parsed.data.conversationId).catch(() => undefined);
    }

    return NextResponse.json({
      answer: response.answer,
      links: response.links ?? [],
      openThreeCxLabel: response.openThreeCxLabel,
      offerContact,
      messageId,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez ou contactez-nous." },
      { status: 500 },
    );
  }
}
