import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { buildQuoteEmailHtml } from "@/lib/quote-email";
import { sendEmail } from "@/lib/email";
import { getQuoteById, updateQuote } from "@/lib/quotes";

type RouteContext = { params: Promise<{ id: string }> };

const emailSchema = z.object({
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(1).max(10000),
});

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const quote = await getQuoteById(id);
    if (!quote) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

    const body = await request.json();
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
    const html = buildQuoteEmailHtml(quote, siteUrl, parsed.data.body);

    const sent = await sendEmail({
      to: quote.email,
      subject: parsed.data.subject,
      html,
      replyTo: fromEmail,
    });

    if (!sent) {
      return NextResponse.json({ error: "Échec de l'envoi email." }, { status: 502 });
    }

    await updateQuote(id, {
      status: quote.status === "draft" ? "sent" : undefined,
      metadata: {
        lastEmailSentAt: new Date().toISOString(),
        lastEmailSubject: parsed.data.subject,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/quotes/email] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
