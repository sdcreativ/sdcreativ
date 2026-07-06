import type { Project } from "@/lib/projects";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  formatProjectBudget,
  formatProjectDate,
} from "@/content/projects-labels";

export function buildProjectsCsv(projects: Project[]): string {
  const header =
    "Référence,Nom,Client,Type,Statut,Chef de projet,Progression %,Budget,Début,Livraison";
  const lines = projects.map((p) =>
    [
      p.id,
      csvCell(p.name),
      csvCell(p.clientCompany || p.clientName),
      PROJECT_TYPE_LABELS[p.type],
      PROJECT_STATUS_LABELS[p.status],
      csvCell(p.assignee ?? ""),
      p.progress,
      p.budget ?? "",
      p.startDate ?? "",
      p.dueDate ?? "",
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

export function buildProjectsPdfHtml(projects: Project[], siteUrl: string): string {
  const rows = projects
    .map(
      (p) => `<tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.clientCompany || p.clientName)}</td>
        <td>${PROJECT_STATUS_LABELS[p.status]}</td>
        <td>${p.progress} %</td>
        <td>${formatProjectDate(p.dueDate)}</td>
        <td>${formatProjectBudget(p.budget)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Export projets — SD CREATIV</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; max-width: 960px; margin: 40px auto; padding: 0 24px; }
    h1 { color: #1e40af; font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.875rem; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; }
    .footer { margin-top: 40px; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Projets CRM</h1>
  <p>${projects.length} projet(s) — généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}</p>
  <table>
    <thead>
      <tr><th>Projet</th><th>Client</th><th>Statut</th><th>Avancement</th><th>Livraison</th><th>Budget</th></tr>
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
