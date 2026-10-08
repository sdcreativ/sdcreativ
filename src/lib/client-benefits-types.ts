/** Avantages promis aux clients (ex. maintenance de la 2e année à -50 %) — règles pures, sans base. */

export const BENEFIT_KINDS = ["none", "maintenance_discount"] as const;
export type BenefitKind = (typeof BENEFIT_KINDS)[number];

export const BENEFIT_STATUSES = ["pending", "active", "completed", "missed", "cancelled"] as const;
export type BenefitStatus = (typeof BENEFIT_STATUSES)[number];

export const BENEFIT_STATUS_LABELS: Record<BenefitStatus, string> = {
  pending: "À venir",
  active: "En cours (appliqué)",
  completed: "Terminé",
  missed: "Non appliqué — à régulariser",
  cancelled: "Annulé",
};

/** Promesse structurée, telle que figée sur l'inscription au popup. */
export type BenefitTerms = {
  kind: BenefitKind;
  percent: number | null;
  startMonths: number | null;
  durationMonths: number | null;
};

export function hasBenefit(terms: BenefitTerms): terms is BenefitTerms & {
  kind: "maintenance_discount";
  percent: number;
  startMonths: number;
  durationMonths: number;
} {
  return (
    terms.kind === "maintenance_discount" &&
    terms.percent != null &&
    terms.percent > 0 &&
    terms.startMonths != null &&
    terms.durationMonths != null &&
    terms.durationMonths > 0
  );
}

/** Ajoute des mois à une date AAAA-MM-JJ (le 31 janvier + 1 mois → 28/29 février). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Période de l'avantage à partir de la signature : [début, fin[ en dates AAAA-MM-JJ. */
export function benefitWindow(signedOn: string, startMonths: number, durationMonths: number) {
  const startsOn = addMonths(signedOn, startMonths);
  return { startsOn, endsOn: addMonths(startsOn, durationMonths) };
}

/** L'avantage s'applique-t-il à une facture émise à cette date ? */
export function benefitAppliesOn(
  benefit: { status: BenefitStatus; startsOn: string; endsOn: string },
  billingDate: string,
): boolean {
  return (
    (benefit.status === "pending" || benefit.status === "active") &&
    billingDate >= benefit.startsOn &&
    billingDate < benefit.endsOn
  );
}

/** Abonnement de maintenance : marqué comme tel, ou « maintenance » dans le titre / les lignes. */
export function isMaintenanceSubscription(sub: {
  title: string;
  lines: { label: string }[];
  metadata?: Record<string, unknown>;
}): boolean {
  if (sub.metadata?.kind === "maintenance") return true;
  return /mainten/i.test(sub.title) || sub.lines.some((l) => /mainten/i.test(l.label));
}

/**
 * Applique la remise promise aux lignes d'une facture de maintenance. Chaque ligne indique la
 * remise et le code, pour que le client voie que la promesse est tenue.
 */
export function applyBenefitToLines<L extends { label: string; amount: number }>(
  lines: L[],
  percent: number,
  promoCode: string,
): { lines: L[]; discount: number } {
  const factor = (10000 - Math.round(percent * 100)) / 10000;
  const pct = percent.toLocaleString("fr-FR");
  let discount = 0;
  const discounted = lines.map((line) => {
    const amount = Math.round(line.amount * factor);
    discount += line.amount - amount;
    return { ...line, amount, label: `${line.label} — remise -${pct} % (avantage ${promoCode})` };
  });
  return { lines: discounted, discount };
}
