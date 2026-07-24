import { NextResponse } from "next/server";
import { getChatResponse } from "@/lib/chat-responder";
import { isHoneypotTripped } from "@/lib/spam-guard";
import { chatSchema } from "@/lib/validations/chat";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de messages. Réessayez dans une heure." },
        { status: 429 },
      );
    }

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

    const response = await getChatResponse(parsed.data.message, parsed.data.locale);

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
