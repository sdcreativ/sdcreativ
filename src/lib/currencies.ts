export const SUPPORTED_CURRENCIES = ["XOF", "EUR", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  XOF: "FCFA (XOF)",
  EUR: "Euro (EUR)",
  USD: "Dollar (USD)",
};

export function formatMoney(amount: number, currency: SupportedCurrency = "XOF"): string {
  if (currency === "XOF") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} FCFA`;
  }
  return new Intl.NumberFormat(currency === "EUR" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function normalizeCurrency(value: string | null | undefined): SupportedCurrency {
  const upper = (value ?? "XOF").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency)
    ? (upper as SupportedCurrency)
    : "XOF";
}
