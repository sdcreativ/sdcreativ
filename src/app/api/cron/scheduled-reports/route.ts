import { NextResponse } from "next/server";
import {
  buildReportsComparison,
  buildReportsCsv,
  getMonthlyExportRows,
  getReportsSummary,
  resolvePreviousPeriod,
  type ReportsKpis,
} from "@/lib/reports";
import { isDatabaseConfigured } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatReportAmount, formatReportDelta } from "@/content/reports-labels";
import {
  getOperationsSettings,
  markScheduledReportSent,
  shouldSendScheduledReport,
} from "@/lib/operations-settings";
import type { ReportKpiKey } from "@/lib/operations-settings-types";
import { REPORT_KPI_LABELS } from "@/lib/operations-settings-types";

function kpiValue(kpis: ReportsKpis, key: ReportKpiKey): string | number {
  const value = kpis[key];
  if (key === "revenueQuotes" || key === "pipelineValue") {
    return formatReportAmount(value as number);
  }
  return value as number;
}

/** Cron — envoie les rapports CRM configurés (ou fallback env). Header: Authorization: Bearer CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const operations = await getOperationsSettings();
    const dueReports = operations.scheduledReports.filter((r) => shouldSendScheduledReport(r));

    if (dueReports.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      let sent = 0;

      for (const report of dueReports) {
        const period = report.frequency === "weekly" ? "week" : "month";
        const summary = await getReportsSummary(period);
        let comparisonHtml = "";

        if (report.includeComparison) {
          const previousRange = resolvePreviousPeriod(period);
          if (previousRange) {
            const previousSummary = await getReportsSummary(period, {}, previousRange);
            const comparison = buildReportsComparison(
              summary.kpis,
              previousSummary.kpis,
              previousRange.label,
            );
            comparisonHtml = `<p><strong>vs ${comparison.previousPeriodLabel}</strong></p><ul>${comparison.metrics
              .slice(0, 4)
              .map(
                (m) =>
                  `<li>${m.label} : ${m.current} (${formatReportDelta(m.delta, m.deltaPercent)} vs N-1)</li>`,
              )
              .join("")}</ul>`;
          }
        }

        const kpiHtml = `<ul>${report.kpis
          .map((k) => `<li>${REPORT_KPI_LABELS[k]} : ${kpiValue(summary.kpis, k)}</li>`)
          .join("")}</ul>`;

        const csv = report.includeCsv
          ? `<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:11px;overflow:auto">${buildReportsCsv(await getMonthlyExportRows(12)).replace(/</g, "&lt;")}</pre>`
          : "";

        const html = `
          <p>Rapport CRM — <strong>${report.label}</strong> (${summary.period.label})</p>
          ${kpiHtml}
          ${comparisonHtml}
          <p><a href="${siteUrl}/admin/crm/rapports">Ouvrir les rapports</a></p>
          ${csv}
        `;

        await sendEmail({
          subject: `[SD CREATIV CRM] ${report.label} — ${summary.period.label}`,
          html,
          to: report.recipients,
        });

        await markScheduledReportSent(report.id);
        sent += 1;
      }

      return NextResponse.json({ sent, source: "operations_settings" });
    }

    const recipients = (process.env.REPORT_CRON_RECIPIENTS ?? process.env.EMAIL_TO ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0, message: "Aucun rapport planifié ni fallback env." });
    }

    const summary = await getReportsSummary("month");
    const previousRange = resolvePreviousPeriod("month");
    let comparisonHtml = "";
    if (previousRange) {
      const previousSummary = await getReportsSummary("month", {}, previousRange);
      const comparison = buildReportsComparison(
        summary.kpis,
        previousSummary.kpis,
        previousRange.label,
      );
      comparisonHtml = `<p><strong>vs ${comparison.previousPeriodLabel}</strong></p><ul>${comparison.metrics
        .slice(0, 4)
        .map(
          (m) =>
            `<li>${m.label} : ${m.current} (${formatReportDelta(m.delta, m.deltaPercent)} vs N-1)</li>`,
        )
        .join("")}</ul>`;
    }
    const csv = buildReportsCsv(await getMonthlyExportRows(12));
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const pdfUrl = `${siteUrl}/api/admin/reports/pdf?period=month&compare=1`;

    const html = `
      <p>Rapport CRM automatique — <strong>${summary.period.label}</strong></p>
      <ul>
        <li>Nouveaux leads : ${summary.kpis.newLeads}</li>
        <li>CA devis : ${formatReportAmount(summary.kpis.revenueQuotes)}</li>
        <li>Devis acceptés : ${summary.kpis.quotesAccepted}</li>
        <li>Pipeline : ${formatReportAmount(summary.kpis.pipelineValue)}</li>
      </ul>
      ${comparisonHtml}
      <p><a href="${siteUrl}/admin/crm/rapports">Ouvrir les rapports</a> · <a href="${pdfUrl}">Version PDF</a> (connexion admin requise)</p>
      <pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:11px;overflow:auto">${csv.replace(/</g, "&lt;")}</pre>
    `;

    await sendEmail({
      subject: `[SD CREATIV CRM] Rapport ${summary.period.label}`,
      html,
      to: recipients,
    });

    return NextResponse.json({ sent: recipients.length, period: summary.period.label, source: "env_fallback" });
  } catch (error) {
    console.error("[api/cron/scheduled-reports] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
