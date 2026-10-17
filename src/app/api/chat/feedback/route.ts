import { NextResponse } from "next/server";
import { z } from "zod";
import { rateAssistantMessage } from "@/lib/chat-conversations";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const feedbackSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().regex(/^\d{1,18}$/),
  rating: z.union([z.literal(1), z.literal(-1)]),
});

/** 👍 / 👎 sur une réponse de Nari — alimente « Questions à améliorer » dans l'admin. */
export async function POST(request: Request) {
  const limited = consumeRateLimit("public-chat-feedback", getClientIp(request), { limit: 60, windowMs: 60_000 });
  if (limited.limited) return new NextResponse(null, { status: 204 });
  try {
    const parsed = feedbackSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Avis invalide." }, { status: 400 });
    const ok = await rateAssistantMessage(parsed.data.conversationId, parsed.data.messageId, parsed.data.rating);
    return ok ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Message introuvable." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
