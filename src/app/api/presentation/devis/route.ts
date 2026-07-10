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
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/lead-activities";
import { createPresentationDevisSchema } from "@/lib/validations/presentation-devis";
import { PRESENTATION_LOCATION_LABELS } from "@/lib/presentation-slides";

export async function POST(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const quoteConfig = await getSiteQuoteConfigSettings();
    const schema = createPresentationDevisSchema(quoteConfig);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;
    const presentation = data.presentation;

    if (presentation.presenterId !== session.userId) {
      return NextResponse.json({ error: "Session présentateur invalide." }, { status: 403 });
    }

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

    const trackLabel = presentation.track === "salon" ? "Salon" : "Bureau";
    const locationLabel = PRESENTATION_LOCATION_LABELS[presentation.location];

    const sent = await sendEmail({
      replyTo: data.email,
      subject: `[SD CREATIV] Brief tablette — ${quote.projectLabel} — ${data.name}`,
      html: `
        <h2>Brief validé — présentation tablette</h2>
        ${htmlRow("Parcours", trackLabel)}
        ${htmlRow("Lieu", presentation.locationNote ? `${locationLabel} — ${presentation.locationNote}` : locationLabel)}
        ${htmlRow("Présentateur", presentation.presenterName)}
        ${htmlRow("Notes présentateur", presentation.presenterNotes || "—")}
        <hr />
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
        { error: "Impossible d'enregistrer le brief. Réessayez plus tard." },
        { status: 500 },
      );
    }

    const lead = await createLead({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      source: "presentation_tablet",
      status: "quote_sent",
      service: quote.projectLabel,
      budget: data.budget,
      timeline: data.timeline,
      message: data.message || null,
      estimatedValue: quote.subtotal,
      assignee: presentation.presenterName,
      actorName: presentation.presenterName,
      metadata: {
        projectTypeId: data.projectTypeId,
        pageTierId: data.pageTierId,
        addonIds: data.addonIds,
        formattedSubtotal: quote.formattedSubtotal,
        formattedRange: quote.formattedRange,
        lines: quote.lines,
        presentation,
      },
    });

    if (lead) {
      await createLeadActivity({
        leadId: lead.id,
        type: "note",
        subject: `Brief tablette validé — ${trackLabel}`,
        content: [
          `Lieu : ${locationLabel}`,
          presentation.presenterNotes ? `Notes : ${presentation.presenterNotes}` : null,
          `Slides : ${presentation.slidesCompleted.join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
        actorName: presentation.presenterName,
      });
    }

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
      leadId: lead?.id ?? null,
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
