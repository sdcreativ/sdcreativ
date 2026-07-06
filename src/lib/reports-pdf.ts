import type { ReportsComparison, ReportsSummary } from "@/lib/reports";
import { formatReportAmount, formatReportMonth, formatReportPercent, formatReportDelta } from "@/content/reports-labels";
import { LEAD_PIPELINE_COLUMNS } from "@/content/leads-labels";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";
import type { QuoteStatus } from "@/content/quotes-labels";

export function buildReportsPdfHtml(
  summary: ReportsSummary,
  siteUrl: string,
  comparison?: ReportsComparison | null,
): string {
  const trendRows = summary.monthlyTrend
    .map(
      (row) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${formatReportMonth(row.month)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${row.leads}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${row.quotesSent}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${formatReportAmount(row.revenue)}</td>
        </tr>`,
    )
    .join("");

  const comparisonRows = comparison
    ? comparison.metrics
        .map(
          (m) =>
            `<tr>
              <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${m.label}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${m.current}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${m.previous}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right">${formatReportDelta(m.delta, m.deltaPercent)}</td>
            </tr>`,
        )
        .join("")
    : "";

  const leadPipeline = LEAD_PIPELINE_COLUMNS.map(({ status, title }) => {
    const row = summary.leadPipeline.find((r) => r.key === status);
    return `<li>${title} : ${row?.count ?? 0} (${formatReportAmount(row?.amount ?? 0)})</li>`;
  }).join("");

  const quotePipeline = summary.quotePipeline
    .filter((r) => r.count > 0)
    .map(
      (row) =>
        `<li>${QUOTE_STATUS_LABELS[row.key as QuoteStatus] ?? row.key} : ${row.count} (${formatReportAmount(row.amount)})</li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport CRM — ${summary.period.label}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; max-width: 900px; margin: 40px auto; padding: 0 24px; }
    h1 { color: #1e40af; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
    .kpi { background: #f3f4f6; border-radius: 8px; padding: 12px; }
    .kpi strong { display: block; font-size: 1.25rem; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.875rem; }
    th { text-align: left; padding: 8px 10px; background: #f3f4f6; font-size: 0.75rem; text-transform: uppercase; }
    ul { margin: 8px 0; padding-left: 20px; }
    .footer { margin-top: 40px; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Rapport CRM SD CREATIV</h1>
  <p>Période : <strong>${summary.period.label}</strong> · Généré le ${new Intl.DateTimeFormat("fr-FR").format(new Date())}</p>

  <div class="kpis">
    <div class="kpi"><span>Nouveaux leads</span><strong>${summary.kpis.newLeads}</strong></div>
    <div class="kpi"><span>Conversion leads</span><strong>${formatReportPercent(summary.kpis.leadConversionRate)}</strong></div>
    <div class="kpi"><span>CA devis</span><strong>${formatReportAmount(summary.kpis.revenueQuotes)}</strong></div>
    <div class="kpi"><span>Devis acceptés</span><strong>${summary.kpis.quotesAccepted}</strong></div>
    <div class="kpi"><span>Conversion devis</span><strong>${formatReportPercent(summary.kpis.quoteConversionRate)}</strong></div>
    <div class="kpi"><span>Pipeline</span><strong>${formatReportAmount(summary.kpis.pipelineValue)}</strong></div>
  </div>

  ${comparison ? `<h2>Comparaison vs ${comparison.previousPeriodLabel}</h2>
  <table>
    <thead><tr><th>Indicateur</th><th>Actuel</th><th>N-1</th><th>Évolution</th></tr></thead>
    <tbody>${comparisonRows}</tbody>
  </table>` : ""}

  <h2>Pipeline leads</h2>
  <ul>${leadPipeline}</ul>

  <h2>Pipeline devis</h2>
  <ul>${quotePipeline || "<li>Aucun devis</li>"}</ul>

  <h2>Tendance 12 mois</h2>
  <table>
    <thead><tr><th>Mois</th><th>Leads</th><th>Devis</th><th>CA</th></tr></thead>
    <tbody>${trendRows}</tbody>
  </table>

  <div class="footer">${siteUrl} — Rapport généré automatiquement</div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}
