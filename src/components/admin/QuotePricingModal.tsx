"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { getBudgetLabel, getTimelineLabel } from "@/content/contact-options";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { QuoteComposerFields } from "@/components/admin/QuoteComposerFields";
import {
  CURRENCY_LABELS,
  exchangeRateHint,
  normalizeCurrency,
  suggestedRateToXof,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currencies";
import { composerLinesSubtotal, createComposerLine, type QuoteComposerLine } from "@/lib/quote-composer";
import { stripQuantitySuffix, type QuoteRequestSummary } from "@/lib/quote-pricing";
import type { QuotePromo } from "@/lib/quote-promo";
import type { Quote } from "@/lib/quotes";
import { fetchQuotePricingContext, priceQuoteApi } from "@/lib/quotes-api";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function linesFromQuote(quote: Quote): QuoteComposerLine[] {
  return quote.lines.map((line) => {
    const quantity = line.quantity && line.quantity > 0 ? line.quantity : 1;
    return createComposerLine({
      catalogItemId: line.catalogItemId,
      label: stripQuantitySuffix(line.label),
      quantity,
      unitPrice: line.unitPrice ?? Math.round(line.amount / quantity),
    });
  });
}

/**
 * Chiffrage d'un devis existant (demande du configurateur ou devis à ajuster) : la demande du client
 * à côté de l'éditeur de lignes. Le devis garde sa référence et son prospect.
 */
export function QuotePricingModal({
  quote,
  onClose,
  onSaved,
}: {
  quote: Quote;
  onClose: () => void;
  onSaved: (quote: Quote) => void;
}) {
  const priced = quote.subtotal > 0 && quote.lines.length > 0;
  const [request, setRequest] = useState<QuoteRequestSummary | null>(null);
  const [lines, setLines] = useState<QuoteComposerLine[]>(() => (priced ? linesFromQuote(quote) : []));
  const [projectLabel, setProjectLabel] = useState(quote.projectLabel);
  const [currency, setCurrency] = useState<SupportedCurrency>(normalizeCurrency(quote.currency));
  const [exchangeRate, setExchangeRate] = useState(
    quote.exchangeRateToXof != null ? String(quote.exchangeRateToXof) : "",
  );
  const [promo, setPromo] = useState<QuotePromo | null>(null);
  const initialCode = typeof quote.metadata?.promoCode === "string" ? quote.metadata.promoCode : "";
  const [promoCode, setPromoCode] = useState(initialCode);
  const [loading, setLoading] = useState(!priced);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchQuotePricingContext(quote.id)
      .then((context) => {
        if (cancelled) return;
        setRequest(context.request);
        setPromo(context.promo);
        // Code obtenu via le popup et connu par le prospect : proposé sur le devis.
        if (context.promo) setPromoCode((current) => current || context.promo!.code);
        // Demande non chiffrée : on part de la grille tarifaire du configurateur.
        if (!priced) setLines(context.suggestedLines.map((line) => createComposerLine(line)));
      })
      .catch(() => {
        if (!cancelled && !priced) setLines([createComposerLine({ label: quote.projectLabel })]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quote.id, quote.projectLabel, priced]);

  const subtotal = composerLinesSubtotal(lines);

  function changeCurrency(next: SupportedCurrency) {
    setCurrency(next);
    const rate = suggestedRateToXof(next);
    setExchangeRate(rate != null ? String(rate) : "");
  }

  async function handleSave() {
    setError("");
    const filled = lines.filter((line) => line.label.trim());
    if (subtotal <= 0 || filled.length === 0) {
      setError("Renseignez au moins une ligne avec un montant.");
      return;
    }
    setSaving(true);
    try {
      const updated = await priceQuoteApi(quote.id, {
        projectLabel: projectLabel.trim() || quote.projectLabel,
        currency,
        exchangeRateToXof: currency === "XOF" ? null : Number(exchangeRate) || null,
        promoCode: promoCode.trim() || null,
        lines: filled.map((line) => ({
          label: line.label.trim(),
          quantity: line.quantity,
          unitPrice: Math.round(line.unitPrice),
          catalogItemId: line.catalogItemId,
        })),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const wish = [
    request?.pageTier && `Pages : ${request.pageTier}`,
    request?.addons.length ? `Options : ${request.addons.join(", ")}` : null,
    request?.pricingPlan && `Formule : ${request.pricingPlan}`,
    quote.budget && `Budget : ${getBudgetLabel(quote.budget)}`,
    quote.timeline && `Délai : ${getTimelineLabel(quote.timeline)}`,
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {priced ? "Modifier le chiffrage" : "Chiffrer le devis"} — {quote.reference}
            </h2>
            <p className="text-sm text-gray-text">
              {quote.company ? `${quote.name} · ${quote.company}` : quote.name}. Même référence, même prospect.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-text" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <section className="rounded-xl border border-primary/20 bg-primary-light/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Demande du client</p>
            <p className="mt-1 font-semibold text-foreground">{request?.projectLabel ?? quote.projectLabel}</p>
            {wish.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground/80">
                {wish.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {quote.message && (
              <p className="mt-2 whitespace-pre-line border-t border-primary/15 pt-2 text-sm italic text-foreground/80">
                « {quote.message} »
              </p>
            )}
          </section>

          <div className="mt-4 rounded-xl border border-gray/40 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Code avantage (popup)
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="SDC-XXXXXX"
                className={`${fieldClass} mt-1 font-mono normal-case tracking-normal`}
              />
            </label>
            {promo && promo.code === promoCode.trim() ? (
              <p className="mt-2 text-sm text-foreground">
                <span className="font-semibold">{promo.benefit ?? "Avantage"}</span>
                <span className="text-gray-text">
                  {" "}
                  — {promo.source === "lead" ? "code obtenu par ce prospect via le popup" : "code enregistré sur le devis"}
                  {promo.status === "expired" ? " · expiré, mais déjà acquis par ce client" : ""}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-text">
                Code donné par le client (WhatsApp, appel…) : il est vérifié à l&apos;enregistrement, écrit sur le devis
                et l&apos;avantage s&apos;applique automatiquement après signature. Videz le champ pour le retirer.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
              Intitulé du projet
              <input
                value={projectLabel}
                onChange={(e) => setProjectLabel(e.target.value)}
                className={`${fieldClass} mt-1 font-normal normal-case tracking-normal`}
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Devise
              <select
                value={currency}
                onChange={(e) => changeCurrency(normalizeCurrency(e.target.value))}
                className={`${fieldClass} mt-1 font-normal normal-case tracking-normal`}
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {CURRENCY_LABELS[code]}
                  </option>
                ))}
              </select>
            </label>
            {currency !== "XOF" && (
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
                Taux figé (1 {currency} = ? XOF)
                <input
                  type="number"
                  min={0.000001}
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className={`${fieldClass} mt-1 font-normal normal-case tracking-normal`}
                />
                <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-gray-text">
                  {exchangeRateHint(currency)}
                </span>
              </label>
            )}
          </div>

          <p className="mt-4 text-xs text-gray-text">
            Montants saisis en {CURRENCY_LABELS[currency]}. Les lignes de départ reprennent la grille du configurateur ;
            le catalogue reste en FCFA — adaptez à la devise si besoin. Les lignes à 0 ne figurent pas sur le devis.
          </p>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-text">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                Chargement de la demande…
              </div>
            ) : (
              <QuoteComposerFields lines={lines} onChange={setLines} currency={currency} />
            )}
          </div>
          {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        </div>

        <div className="border-t border-gray/40 px-6 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || subtotal <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Enregistrer le chiffrage — {formatQuoteAmount(subtotal, currency)}
          </button>
          <p className="mt-2 text-center text-xs text-gray-text">
            Ensuite, « Publier le devis » envoie le PDF au client (e-mail + espace client).
          </p>
        </div>
      </div>
    </div>
  );
}
