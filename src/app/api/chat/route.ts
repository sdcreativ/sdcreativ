import { NextResponse } from "next/server";
import { getChatResponse } from "@/lib/chat-responder";
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
    const response = await getChatResponse(parsed.data.message, locale);

    return NextResponse.json({
      answer: response.answer,
      links: response.links ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez ou contactez-nous." },
      { status: 500 },
    );
  }
}
