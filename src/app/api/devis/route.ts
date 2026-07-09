import { NextResponse } from "next/server";
import {
  getBudgetLabel,
  getTimelineLabel,
} from "@/content/contact-options";
import { calculateQuote } from "@/lib/quote-calculator";
import { getSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";
import { htmlRow, sendEmail } from "@/lib/email";
import { createLead } from "@/lib/leads";
import { createQuoteFromDevis } from "@/lib/quotes";
import { rejectIfBot } from "@/lib/form-guard";
import { createDevisSchema } from "@/lib/validations/devis";

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

    const quoteConfig = await getSiteQuoteConfigSettings();
    const devisSchema = createDevisSchema(quoteConfig);
    const parsed = devisSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;
    const calculatorConfig = {
      projectTypes: quoteConfig.projectTypes,
      pageTiers: quoteConfig.pageTiers,
      addons: quoteConfig.addons,
      estimateNote: quoteConfig.estimateNote,
    };
    const quote = calculateQuote(
      {
        projectTypeId: data.projectTypeId,
        pageTierId: data.pageTierId,
        addonIds: data.addonIds,
      },
      calculatorConfig,
    );

    if (!quote) {
      return NextResponse.json({ error: "Type de projet invalide." }, { status: 400 });
    }

    const pageTier = quoteConfig.pageTiers.find((t) => t.id === data.pageTierId);
    const addonLabels = data.addonIds
      .map((id) => quoteConfig.addons.find((a) => a.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    const breakdown = quote.lines
      .map((line) => `<li>${line.label} : ${line.amount.toLocaleString("fr-FR")} FCFA</li>`)
      .join("");

    const sent = await sendEmail({
      replyTo: data.email,
      subject: `[SD CREATIV] Devis en ligne — ${quote.projectLabel} — ${data.name}`,
      html: `
        <h2>Demande de devis via configurateur</h2>
        ${htmlRow("Nom", data.name)}
        ${htmlRow("Email", data.email)}
        ${htmlRow("Téléphone", data.phone)}
        ${htmlRow("Entreprise", data.company)}
        ${htmlRow("Type de projet", quote.projectLabel)}
        ${htmlRow("Nombre de pages", pageTier?.label)}
        ${htmlRow("Options", addonLabels || "—")}
        ${htmlRow("Budget indicatif client", getBudgetLabel(data.budget))}
        ${htmlRow("Délai souhaité", getTimelineLabel(data.timeline))}
        <h3>Estimation calculée</h3>
        <ul>${breakdown}</ul>
        <p><strong>Total indicatif :</strong> ${quote.formattedSubtotal} HT</p>
        <p><strong>Fourchette :</strong> ${quote.formattedRange} HT</p>
        ${data.message ? `<p><strong>Précisions :</strong><br>${data.message.replace(/\n/g, "<br>")}</p>` : ""}
      `,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Impossible d'envoyer la demande. Réessayez plus tard." },
        { status: 500 },
      );
    }

    const lead = await createLead({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      source: "devis",
      status: "quote_sent",
      service: quote.projectLabel,
      budget: data.budget,
      timeline: data.timeline,
      message: data.message || null,
      estimatedValue: quote.subtotal,
      metadata: {
        projectTypeId: data.projectTypeId,
        pageTierId: data.pageTierId,
        addonIds: data.addonIds,
        formattedSubtotal: quote.formattedSubtotal,
        formattedRange: quote.formattedRange,
        lines: quote.lines,
      },
    });

    void createQuoteFromDevis({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      projectTypeId: data.projectTypeId,
      projectLabel: quote.projectLabel,
      pageTierId: data.pageTierId,
      addonIds: data.addonIds,
      lines: quote.lines,
      subtotal: quote.subtotal,
      estimateMin: quote.estimateMin,
      estimateMax: quote.estimateMax,
      budget: data.budget,
      timeline: data.timeline,
      message: data.message,
      leadId: lead?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      estimate: {
        subtotal: quote.subtotal,
        formattedSubtotal: quote.formattedSubtotal,
        formattedRange: quote.formattedRange,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 },
    );
  }
}
