import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { rejectIfBot } from "@/lib/form-guard";
import {
  PUBLIC_NEWSLETTER_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { newsletterSchema } from "@/lib/validations/newsletter";
import { upsertNewsletterSubscriber } from "@/lib/marketing-subscribers";
import { isDatabaseConfigured } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = consumeRateLimit(
      "public-newsletter",
      ip,
      PUBLIC_NEWSLETTER_RATE_LIMIT,
    );
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

    const body = await request.json();

    const rejected = await rejectIfBot(body);
    if (rejected) return rejected;

    const parsed = newsletterSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email } = parsed.data;

    if (isDatabaseConfigured()) {
      try {
        await upsertNewsletterSubscriber({ email, source: "website" });
      } catch (err) {
        console.error("[api/newsletter] persist", err);
      }
    }

    const sent = await sendEmail({
      subject: "[SD CREATIV] Nouvelle inscription newsletter",
      html: `<p>Nouvelle inscription newsletter : <strong>${email}</strong></p><p>Consentement politique de confidentialité : oui</p>`,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Impossible de finaliser l'inscription." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
