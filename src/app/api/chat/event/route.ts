import { NextResponse } from "next/server";
import { z } from "zod";
import { markConversationWhatsapp } from "@/lib/chat-conversations";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const eventSchema = z.object({
  conversationId: z.string().uuid(),
  kind: z.literal("whatsapp"),
});

/** Suite donnée depuis le chat de l'assistante (passage sur WhatsApp), visible dans CRM → Conversations. */
export async function POST(request: Request) {
  const limited = consumeRateLimit("public-chat-event", getClientIp(request), { limit: 30, windowMs: 60_000 });
  if (limited.limited) return new NextResponse(null, { status: 204 });
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Événement invalide." }, { status: 400 });
    await markConversationWhatsapp(parsed.data.conversationId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
