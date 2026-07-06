export const REPORT_PERIODS = ["week", "month", "quarter", "year", "all"] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];

/** Périodes affichées sur le tableau de bord (sans « Tout »). */
export const DASHBOARD_PERIODS = ["week", "month", "quarter", "year"] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "Cette semaine",
  month: "Ce mois",
  quarter: "Ce trimestre",
  year: "Cette année",
  all: "Tout",
};

export function formatReportAmount(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

export function formatReportMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date);
}

export function formatReportPercent(value: number): string {
  return `${value} %`;
}

export function formatReportDelta(delta: number, deltaPercent: number | null): string {
  if (delta === 0 && deltaPercent === 0) return "—";
  const sign = delta > 0 ? "+" : "";
  if (deltaPercent !== null) return `${sign}${deltaPercent} %`;
  return `${sign}${delta}`;
}
