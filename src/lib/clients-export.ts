import type { Client } from "@/lib/clients";
import { CLIENT_STATUS_LABELS, formatClientDate, formatClientRevenue } from "@/content/clients-labels";

export function buildClientsCsv(clients: Client[]): string {
  const header =
    "ID,Nom,Email,Entreprise,Statut,Account manager,Secteur,Tags,CA encaissé,Échanges,Créé le";
  const lines = clients.map((client) =>
    [
      client.id,
      csvCell(client.name),
      client.email,
      csvCell(client.company ?? ""),
      CLIENT_STATUS_LABELS[client.status],
      csvCell(client.accountManager ?? ""),
      csvCell(client.sector ?? ""),
      csvCell(client.tags.join("; ")),
      client.revenueTotal,
      client.interactionCount,
      client.createdAt.slice(0, 10),
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

export function formatClientsExportSummary(clients: Client[]): string {
  const totalRevenue = clients.reduce((sum, c) => sum + c.revenueTotal, 0);
  return `${clients.length} client(s) — CA total encaissé : ${formatClientRevenue(totalRevenue)} — exporté le ${formatClientDate(new Date().toISOString())}`;
}
