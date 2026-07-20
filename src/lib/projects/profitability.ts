import { withDb } from "@/lib/db";
import { amountToXof, normalizeCurrency } from "@/lib/currencies";
import { getProjectById } from "@/lib/projects";
import { getQuoteById } from "@/lib/quotes";
import { getProjectVendorMargin } from "@/lib/vendors";

export type ProjectProfitability = {
  projectId: string;
  projectName: string;
  budget: number | null;
  quoteRevenue: number;
  quoteRevenueXof: number | null;
  invoicedTotal: number;
  invoicedPaid: number;
  loggedHours: number;
  billableHours: number;
  soldHours: number;
  timeUtilizationPercent: number | null;
  vendorCosts: number;
  vendorMargin: number | null;
  /** CA devis (XOF si possible) − coûts BDC − estimation coût temps (si taux vendeur). */
  contributionMargin: number | null;
  contributionMarginPercent: number | null;
  quoteLines: Array<{ label: string; amount: number }>;
  currency: string;
};

export async function getProjectProfitability(projectId: string): Promise<ProjectProfitability | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const quote = project.sourceQuoteId ? await getQuoteById(project.sourceQuoteId) : null;
  const vendor = await getProjectVendorMargin(projectId);

  return withDb(async (query) => {
    const { rows: timeRows } = await query<{
      logged: string;
      billable: string;
      sold: string;
    }>(
      `SELECT
         COALESCE(SUM(hours), 0)::text AS logged,
         COALESCE(SUM(hours) FILTER (WHERE billable), 0)::text AS billable,
         COALESCE(MAX(sold_hours), 0)::text AS sold
       FROM time_entries WHERE project_id = $1`,
      [projectId],
    );

    const { rows: invoiceRows } = await query<{
      total: string;
      paid: string;
    }>(
      `SELECT COALESCE(SUM(total), 0)::text AS total,
              COALESCE(SUM(paid_amount), 0)::text AS paid
       FROM invoices
       WHERE project_id = $1 OR quote_id = $2`,
      [projectId, project.sourceQuoteId],
    );

    const loggedHours = Number(timeRows[0]?.logged ?? 0);
    const billableHours = Number(timeRows[0]?.billable ?? 0);
    const soldHours = Number(timeRows[0]?.sold ?? 0);
    const invoicedTotal = Number(invoiceRows[0]?.total ?? 0);
    const invoicedPaid = Number(invoiceRows[0]?.paid ?? 0);

    const currency = normalizeCurrency(quote?.currency ?? "XOF");
    const quoteRevenue = quote?.subtotal ?? project.budget ?? 0;
    const quoteRevenueXof = amountToXof(
      quoteRevenue,
      currency,
      quote?.exchangeRateToXof,
    );

    const revenueBase = quoteRevenueXof ?? quoteRevenue;
    const contributionMargin =
      revenueBase > 0 || vendor.vendorCosts > 0
        ? revenueBase - vendor.vendorCosts
        : null;
    const contributionMarginPercent =
      contributionMargin != null && revenueBase > 0
        ? Math.round((contributionMargin / revenueBase) * 100)
        : null;

    const timeUtilizationPercent =
      soldHours > 0 ? Math.round((loggedHours / soldHours) * 100) : null;

    return {
      projectId: project.id,
      projectName: project.name,
      budget: project.budget,
      quoteRevenue,
      quoteRevenueXof,
      invoicedTotal,
      invoicedPaid,
      loggedHours,
      billableHours,
      soldHours,
      timeUtilizationPercent,
      vendorCosts: vendor.vendorCosts,
      vendorMargin: vendor.margin,
      contributionMargin,
      contributionMarginPercent,
      quoteLines: (quote?.lines ?? []).map((l) => ({
        label: l.label,
        amount: l.amount,
      })),
      currency,
    };
  });
}
