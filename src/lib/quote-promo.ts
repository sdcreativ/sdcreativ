import { describeBenefit } from "@/lib/client-benefits-types";
import { getLeadById } from "@/lib/leads";
import { getPopupSignupByCode, markPopupCodeUsed, type PopupSignup } from "@/lib/site-popups";

/**
 * Code avantage (popup) d'un devis : lu sur le devis puis sur son prospect, vérifié, et écrit sur le devis
 * pour figurer sur le PDF et dans l'e-mail. L'avantage lui-même est enregistré à la signature (client-benefits).
 */
export type QuotePromoStatus = "valid" | "used" | "expired";

export type QuotePromo = {
  code: string;
  /** Promesse en clair (« -50 % sur la maintenance de la 2e année »). */
  benefit: string | null;
  status: QuotePromoStatus;
  expiresAt: string;
  /** D'où vient le code connu : devis, ou prospect (inscription au popup). */
  source: "quote" | "lead";
};

type QuoteLike = {
  email: string;
  leadId: string | null;
  metadata: Record<string, unknown>;
};

export class QuotePromoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotePromoError";
  }
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

function statusOf(signup: PopupSignup): QuotePromoStatus {
  if (new Date(signup.codeExpiresAt).getTime() <= Date.now() && !signup.codeUsedAt) return "expired";
  return signup.codeUsedAt ? "used" : "valid";
}

function toPromo(signup: PopupSignup, source: QuotePromo["source"]): QuotePromo {
  return {
    code: signup.code,
    benefit: describeBenefit(signup.benefit, signup.offerLabel),
    status: statusOf(signup),
    expiresAt: signup.codeExpiresAt,
    source,
  };
}

/** Code connu pour ce devis (sur le devis, sinon sur le prospect rattaché). */
export async function resolveQuotePromo(quote: QuoteLike): Promise<QuotePromo | null> {
  const fromQuote = quote.metadata?.promoCode;
  if (typeof fromQuote === "string" && fromQuote) {
    const signup = await getPopupSignupByCode(fromQuote);
    return signup ? toPromo(signup, "quote") : null;
  }
  if (quote.metadata && "promoCode" in quote.metadata) return null;
  if (!quote.leadId) return null;
  const lead = await getLeadById(quote.leadId).catch(() => null);
  const fromLead = lead?.metadata?.promoCode;
  if (typeof fromLead !== "string" || !fromLead) return null;
  const signup = await getPopupSignupByCode(fromLead);
  return signup ? toPromo(signup, "lead") : null;
}

/**
 * Vérifie qu'un code peut être appliqué à ce devis. Accepté s'il est encore valable, ou s'il appartient déjà
 * à ce client (même devis, même prospect ou même e-mail) — un client qui a obtenu son code à temps le garde.
 */
export async function checkPromoForQuote(quote: QuoteLike, rawCode: string): Promise<PopupSignup> {
  const code = normalizePromoCode(rawCode);
  const signup = await getPopupSignupByCode(code);
  if (!signup) throw new QuotePromoError(`Code avantage inconnu : ${code}.`);

  const ownsCode =
    quote.metadata?.promoCode === signup.code ||
    (quote.leadId != null && signup.leadId === quote.leadId) ||
    signup.email.trim().toLowerCase() === quote.email.trim().toLowerCase();
  if (ownsCode) return signup;

  const status = statusOf(signup);
  if (status === "used") throw new QuotePromoError(`Le code ${code} a déjà été utilisé par un autre client.`);
  if (status === "expired") throw new QuotePromoError(`Le code ${code} a expiré.`);
  return signup;
}

/** Champs à fusionner dans les métadonnées du devis (null retire le code). */
export function promoMetadata(signup: PopupSignup | null): Record<string, unknown> {
  if (!signup) return { promoCode: null, promoOffer: null };
  return { promoCode: signup.code, promoOffer: describeBenefit(signup.benefit, signup.offerLabel) };
}

export async function markPromoUsed(signup: PopupSignup | null): Promise<void> {
  if (signup && !signup.codeUsedAt) await markPopupCodeUsed(signup.code);
}
