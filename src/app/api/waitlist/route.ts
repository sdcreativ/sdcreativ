import { NextResponse } from "next/server";
import { htmlRow, sendEmail } from "@/lib/email";
import { isHoneypotTripped } from "@/lib/spam-guard";
import { waitlistSchema } from "@/lib/validations/waitlist";
import { createWaitlistEntry } from "@/lib/marketing-subscribers";
import { isDatabaseConfigured } from "@/lib/db";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const interestLabels: Record<string, string> = {
  "espace-client": "Espace client (Phase 2)",
  crm: "CRM interne (Phase 2)",
  general: "Intérêt général Phase 2",
};

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
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }

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
