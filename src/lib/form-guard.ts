import { NextResponse } from "next/server";
import { isHoneypotTripped } from "@/lib/spam-guard";
import { verifyTurnstileToken } from "@/lib/turnstile";

type BodyWithTokens = {
  _hp?: string;
  turnstileToken?: string;
};

export function honeypotResponse() {
  return NextResponse.json({ success: true });
}

/** Honeypot silencieux + Turnstile si configuré. Retourne une Response ou null si OK. */
export async function rejectIfBot(body: unknown): Promise<NextResponse | null> {
  if (isHoneypotTripped(body)) {
    return honeypotResponse();
  }

  const token =
    body && typeof body === "object"
      ? (body as BodyWithTokens).turnstileToken
      : undefined;

  const valid = await verifyTurnstileToken(token);
  if (!valid) {
    return NextResponse.json(
      { error: "Vérification anti-bot échouée. Rechargez la page et réessayez." },
      { status: 403 },
    );
  }

  return null;
}
