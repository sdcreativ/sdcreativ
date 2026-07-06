import type { Lead } from "@/lib/leads";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, formatLeadDate, formatLeadValue } from "@/content/leads-labels";
import { computeLeadScore } from "@/lib/lead-scoring";

export function buildLeadsCsv(leads: Lead[]): string {
  const header =
    "ID,Nom,Email,Entreprise,Source,Statut,Commercial,Valeur estimée,Budget,Score,Reçu le";
  const lines = leads.map((lead) =>
    [
      lead.id,
      csvCell(lead.name),
      lead.email,
      csvCell(lead.company ?? ""),
      LEAD_SOURCE_LABELS[lead.source],
      LEAD_STATUS_LABELS[lead.status],
      csvCell(lead.assignee ?? ""),
      lead.estimatedValue ?? "",
      csvCell(lead.budget ?? ""),
      computeLeadScore(lead),
      lead.createdAt.slice(0, 10),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildLeadsPdfHtml(leads: Lead[], siteUrl: string): string {
  const rows = leads
    .map((lead) => {
      const score = computeLeadScore(lead);
      return `<tr>
        <td>${escapeHtml(lead.name)}</td>
        <td>${escapeHtml(lead.company || lead.email)}</td>
        <td>${LEAD_SOURCE_LABELS[lead.source]}</td>
        <td>${LEAD_STATUS_LABELS[lead.status]}</td>
        <td>${escapeHtml(lead.assignee ?? "—")}</td>
        <td>${formatLeadValue(lead.estimatedValue)}</td>
        <td>${score}</td>
        <td>${formatLeadDate(lead.createdAt)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Export leads — SD CREATIV</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; max-width: 960px; margin: 40px auto; padding: 0 24px; }
    h1 { color: #1e40af; font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.8rem; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
    th { background: #f3f4f6; }
    .footer { margin-top: 40px; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Leads CRM</h1>
  <p>${leads.length} lead(s) — généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}</p>
  <table>
    <thead>
      <tr><th>Nom</th><th>Client</th><th>Source</th><th>Statut</th><th>Commercial</th><th>Valeur</th><th>Score</th><th>Reçu</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">${escapeHtml(siteUrl)} — SD CREATIV CRM</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
