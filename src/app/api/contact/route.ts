import { NextResponse } from "next/server";
import { getContactSubjectLabel } from "@/content/contact-options";
import { htmlRow, sendEmail } from "@/lib/email";
import { safeCreateLead } from "@/lib/leads";
import { rejectIfBot } from "@/lib/form-guard";
import { contactSchema } from "@/lib/validations/contact";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
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
        { error: "Trop de requêtes. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const body = await request.json();

    const rejected = await rejectIfBot(body);
    if (rejected) return rejected;

    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, phone, company, subject, message } = parsed.data;
    const subjectLabel = getContactSubjectLabel(subject);

    const sent = await sendEmail({
      replyTo: email,
      subject: `[SD CREATIV] Message — ${subjectLabel} — ${name}`,
      html: `
        <h2>Nouveau message via le formulaire de contact</h2>
        ${htmlRow("Nom", name)}
        ${htmlRow("Email", email)}
        ${htmlRow("Téléphone", phone)}
        ${htmlRow("Entreprise", company)}
        ${htmlRow("Sujet", subjectLabel)}
        <p><strong>Message :</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Impossible d'envoyer le message. Réessayez plus tard." },
        { status: 500 },
      );
    }

    void safeCreateLead({
      name,
      email,
      phone: phone || null,
      company: company || null,
      source: "contact",
      service: subjectLabel,
      message,
      metadata: { subject, channel: "contact_form" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
