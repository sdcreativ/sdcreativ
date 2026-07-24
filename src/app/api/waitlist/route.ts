import { NextResponse } from "next/server";
import { htmlRow, sendEmail } from "@/lib/email";
import { isHoneypotTripped } from "@/lib/spam-guard";
import {
  PUBLIC_FORM_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { waitlistSchema } from "@/lib/validations/waitlist";
import { createWaitlistEntry } from "@/lib/marketing-subscribers";
import { isDatabaseConfigured } from "@/lib/db";

const interestLabels: Record<string, string> = {
  "espace-client": "Espace client (Phase 2)",
  crm: "CRM interne (Phase 2)",
  general: "Intérêt général Phase 2",
};

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = consumeRateLimit("public-waitlist", ip, PUBLIC_FORM_RATE_LIMIT);
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

    const body = await request.json();

    if (isHoneypotTripped(body)) {
      return NextResponse.json({ success: true });
    }

    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 },
      );
    }

    const { name, email, company, interest, message } = parsed.data;

    if (isDatabaseConfigured()) {
      try {
        await createWaitlistEntry({ name, email, company, interest, message });
      } catch (err) {
        console.error("[api/waitlist] persist", err);
      }
    }

    await sendEmail({
      subject: `[Phase 2] ${interestLabels[interest] ?? interest} — ${name}`,
      html: `
        <h2>Nouvelle inscription waitlist Phase 2</h2>
        ${htmlRow("Intérêt", interestLabels[interest] ?? interest)}
        ${htmlRow("Nom", name)}
        ${htmlRow("Email", email)}
        ${company ? htmlRow("Entreprise", company) : ""}
        ${message ? htmlRow("Message", message) : ""}
      `,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
