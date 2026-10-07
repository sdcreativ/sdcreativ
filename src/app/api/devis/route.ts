import { NextResponse } from "next/server";
import {
  getBudgetLabel,
  getTimelineLabel,
} from "@/content/contact-options";
import { calculateQuote } from "@/lib/quote-calculator";
import { getSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";
import { htmlRow, sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/blog-content";
import { createLead } from "@/lib/leads";
import { createQuoteFromDevis } from "@/lib/quotes";
import { rejectIfBot } from "@/lib/form-guard";
import {
  PUBLIC_FORM_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { createDevisSchema } from "@/lib/validations/devis";
import { formatPlanAmount, PRICING_REFERRAL_OFFER } from "@/lib/pricing-display";
import { getPricingContext, getVisiblePricingPlanBySlug, planQuoteLines } from "@/lib/public-pricing";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = consumeRateLimit("public-devis", ip, PUBLIC_FORM_RATE_LIMIT);
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

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

    // Demande venant d'une carte tarifs : devis pré-rempli avec les lignes HT de la formule.
    let planEstimate: { planName: string; lines: { label: string; amount: number }[]; subtotal: number } | null = null;
    if (data.pricingPlan) {
      try {
        const [plan, pricingSettings] = await Promise.all([
          getVisiblePricingPlanBySlug(data.pricingPlan),
          getPricingContext(),
        ]);
        const built = plan ? planQuoteLines(plan, pricingSettings) : null;
        if (plan && built) planEstimate = { planName: plan.name, ...built };
      } catch (error) {
        console.error("[devis] pré-remplissage formule impossible:", error);
      }
    }

    const pageTier = quoteConfig.pageTiers.find((t) => t.id === data.pageTierId);
    const addonLabels = data.addonIds
      .map((id) => quoteConfig.addons.find((a) => a.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    const planBlock = planEstimate
      ? `<h3>Formule ${escapeHtml(planEstimate.planName)} — devis pré-rempli (HT)</h3>
        <ul>${planEstimate.lines
          .map((line) => `<li>${escapeHtml(line.label)} : ${formatPlanAmount(line.amount)} FCFA</li>`)
          .join("")}</ul>
        <p><strong>Sous-total :</strong> ${formatPlanAmount(planEstimate.subtotal)} FCFA HT</p>`
      : "";

    const estimateBlock = quote.hasPricedEstimate
      ? `<h3>Estimation calculée</h3>
        <ul>${quote.lines
          .map((line) => `<li>${line.label} : ${line.amount.toLocaleString("fr-FR")} FCFA</li>`)
          .join("")}</ul>
        <p><strong>Total indicatif :</strong> ${quote.formattedSubtotal} HT</p>
        <p><strong>Fourchette :</strong> ${quote.formattedRange} HT</p>`
      : `<h3>Estimation</h3>
        <p>Devis personnalisé — montants à confirmer après étude du besoin.</p>`;

    const sent = await sendEmail({
      replyTo: data.email,
      subject: `[SD CREATIV] Devis en ligne — ${quote.projectLabel} — ${data.name}`,
      html: `
        <h2>Demande de devis via configurateur</h2>
        ${htmlRow("Nom", data.name)}
        ${htmlRow("Email", data.email)}
        ${htmlRow("Téléphone", data.phone)}
        ${htmlRow("Entreprise", data.company)}
        ${htmlRow("Formule tarifaire", data.pricingPlan)}
        ${htmlRow("Offre", data.pricingOffer === PRICING_REFERRAL_OFFER ? "Remise parrainage hébergement Hostinger" : undefined)}
        ${htmlRow("Type de projet", quote.projectLabel)}
        ${htmlRow("Nombre de pages", pageTier?.label)}
        ${htmlRow("Options", addonLabels || "—")}
        ${htmlRow("Budget indicatif client", getBudgetLabel(data.budget))}
        ${htmlRow("Délai souhaité", getTimelineLabel(data.timeline))}
        ${planBlock || estimateBlock}
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
      estimatedValue: planEstimate ? planEstimate.subtotal : quote.hasPricedEstimate ? quote.subtotal : null,
      metadata: {
        projectTypeId: data.projectTypeId,
        pageTierId: data.pageTierId,
        addonIds: data.addonIds,
        formattedSubtotal: quote.formattedSubtotal,
        formattedRange: quote.formattedRange,
        lines: quote.lines,
        ...(data.pricingPlan ? { pricingPlan: data.pricingPlan } : {}),
        ...(data.pricingOffer ? { pricingOffer: data.pricingOffer } : {}),
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
      lines: planEstimate ? planEstimate.lines : quote.lines,
      subtotal: planEstimate ? planEstimate.subtotal : quote.subtotal,
      estimateMin: planEstimate ? planEstimate.subtotal : quote.estimateMin,
      estimateMax: planEstimate ? planEstimate.subtotal : quote.estimateMax,
      budget: data.budget,
      timeline: data.timeline,
      message: data.message,
      leadId: lead?.id ?? null,
      ...(data.pricingPlan
        ? { metadata: { pricingPlan: data.pricingPlan, ...(data.pricingOffer ? { pricingOffer: data.pricingOffer } : {}) } }
        : {}),
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
