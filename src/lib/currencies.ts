/**
 * Devises commerciales SD CREATIV.
 * Pivot interne catalogue = XOF (FCFA). Devis/factures peuvent être en autre devise.
 */

export const SUPPORTED_CURRENCIES = ["XOF", "EUR", "USD", "GBP", "GHS"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  XOF: "FCFA (XOF)",
  EUR: "Euro (EUR)",
  USD: "Dollar US (USD)",
  GBP: "Livre sterling (GBP)",
  GHS: "Cedi ghanéen (GHS)",
};

/** Taux indicatifs : 1 unité devise = N XOF (à figer sur le devis). EUR ≈ parité BCEAO. */
export const SUGGESTED_RATES_TO_XOF: Record<Exclude<SupportedCurrency, "XOF">, number> = {
  EUR: 655.957,
  USD: 600,
  GBP: 760,
  GHS: 40,
};

export function formatMoney(amount: number, currency: SupportedCurrency = "XOF"): string {
  if (currency === "XOF") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} FCFA`;
  }
  if (currency === "GHS") {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat(currency === "EUR" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyHt(amount: number, currency: SupportedCurrency = "XOF"): string {
  return `${formatMoney(amount, currency)} HT`;
}

export function normalizeCurrency(value: string | null | undefined): SupportedCurrency {
  const upper = (value ?? "XOF").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency)
    ? (upper as SupportedCurrency)
    : "XOF";
}

export function suggestedRateToXof(currency: SupportedCurrency): number | null {
  if (currency === "XOF") return null;
  return SUGGESTED_RATES_TO_XOF[currency];
}

export function resolveExchangeRateToXof(
  currency: SupportedCurrency,
  explicit?: number | null,
): number | null {
  if (currency === "XOF") return null;
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) return explicit;
  return suggestedRateToXof(currency);
}

/** Équivalent XOF arrondi (null si taux manquant). */
export function amountToXof(
  amount: number,
  currency: SupportedCurrency,
  rateToXof: number | null | undefined,
): number | null {
  if (currency === "XOF") return Math.round(amount);
  if (rateToXof == null || rateToXof <= 0) return null;
  return Math.round(amount * rateToXof);
}

export function exchangeRateHint(currency: SupportedCurrency): string | null {
  if (currency === "XOF") return null;
  const rate = suggestedRateToXof(currency);
  if (!rate) return null;
  return `Indicatif : 1 ${currency} ≈ ${rate.toLocaleString("fr-FR")} XOF — figer le taux sur le devis.`;
}
