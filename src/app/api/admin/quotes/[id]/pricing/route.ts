import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { logBillingEvent } from "@/lib/billing/events";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { normalizeCurrency, resolveExchangeRateToXof } from "@/lib/currencies";
import { isDatabaseConfigured } from "@/lib/db";
import { quotePricingSchema, quoteRequestFromConfig } from "@/lib/quote-pricing";
import {
  checkPromoForQuote,
  markPromoUsed,
  promoMetadata,
  QuotePromoError,
  resolveQuotePromo,
} from "@/lib/quote-promo";
import { getQuoteById, QuotePricingError, updateQuote, updateQuotePricing } from "@/lib/quotes";
import { getSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";

type RouteContext = { params: Promise<{ id: string }> };

/** Demande du client (configurateur) et lignes de départ au tarif de la grille, pour chiffrer le devis. */
export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const quote = await getQuoteById(id);
    if (!quote) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

    const config = await getSiteQuoteConfigSettings();
    const currency = normalizeCurrency(quote.currency);
    const result = quoteRequestFromConfig(quote, config, resolveExchangeRateToXof(currency, quote.exchangeRateToXof));
    const promo = await resolveQuotePromo(quote).catch(() => null);
    return NextResponse.json({ ...result, promo });
  } catch (error) {
    console.error("[api/admin/quotes/pricing] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Enregistre le chiffrage (lignes, intitulé, devise) sur le devis existant. */
export async function PUT(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const parsed = quotePricingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const { promoCode, ...pricing } = parsed.data;
    // Code vérifié avant tout enregistrement : un code refusé ne laisse pas un chiffrage à moitié appliqué.
    let promoSignup: Awaited<ReturnType<typeof checkPromoForQuote>> | null = null;
    if (promoCode) {
      const current = await getQuoteById(id);
      if (!current) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
      promoSignup = await checkPromoForQuote(current, promoCode);
    }

    const result = await updateQuotePricing(id, pricing);
    if (!result) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });

    let { quote } = result;
    const { previousSubtotal, previousCurrency } = result;
    // Toujours écrit quand le champ est envoyé : retirer un code venu du prospect doit aussi être enregistré.
    if (promoCode !== undefined) {
      quote = (await updateQuote(id, { metadata: promoMetadata(promoSignup) })) ?? quote;
      await markPromoUsed(promoSignup);
    }
    const session = await getAdminSession();
    await logBillingEvent({
      entityType: "quote",
      entityId: quote.id,
      action: "priced",
      actor: { type: "admin", id: session?.userId ?? null, name: session?.name ?? "Administrateur" },
      fromStatus: quote.status,
      toStatus: quote.status,
      summary:
        previousSubtotal > 0
          ? `Chiffrage modifié : ${formatQuoteAmount(previousSubtotal, previousCurrency)} → ${formatQuoteAmount(quote.subtotal, quote.currency)}`
          : `Devis chiffré : ${formatQuoteAmount(quote.subtotal, quote.currency)}`,
      metadata: {
        lines: quote.lines.length,
        subtotal: quote.subtotal,
        currency: quote.currency,
        promoCode: quote.metadata?.promoCode ?? null,
      },
    }).catch((error) => console.error("[api/admin/quotes/pricing] journal", error));

    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof QuotePromoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof QuotePricingError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/quotes/pricing] PUT", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
