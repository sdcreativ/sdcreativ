import { withDb } from "@/lib/db";

export type AccountingExportRow = {
  type: "invoice" | "payment";
  reference: string;
  date: string;
  clientName: string;
  company: string | null;
  subtotal: number;
  tvaRate: number;
  tvaAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  paymentMode: string | null;
};

export type AccountingExportFilters = {
  from?: string;
  to?: string;
  clientId?: string;
  status?: string;
};

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function getAccountingExportRows(
  filters?: AccountingExportFilters,
): Promise<AccountingExportRow[]> {
  return withDb(async (query) => {
    const clauses: string[] = ["i.status <> 'draft'"];
    const params: unknown[] = [];

    if (filters?.from) {
      params.push(filters.from);
      clauses.push(`i.created_at >= $${params.length}::date`);
    }
    if (filters?.to) {
      params.push(filters.to);
      clauses.push(`i.created_at <= ($${params.length}::date + interval '1 day')`);
    }
    if (filters?.clientId) {
      params.push(filters.clientId);
      clauses.push(`i.client_id = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      clauses.push(`i.status = $${params.length}`);
    }

    const where = `WHERE ${clauses.join(" AND ")}`;

    const { rows } = await query<{
      reference: string;
      created_at: Date;
      paid_at: Date | null;
      name: string;
      company: string | null;
      client_name: string | null;
      subtotal: number;
      tva_rate: string | number;
      tva_amount: number;
      total: number;
      paid_amount: number;
      status: string;
      metadata: Record<string, unknown> | null;
    }>(`
      SELECT i.reference, i.created_at, i.paid_at, i.name, i.company,
             c.name AS client_name, i.subtotal, i.tva_rate, i.tva_amount,
             i.total, i.paid_amount, i.status, i.metadata
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      ${where}
      ORDER BY i.created_at ASC
    `, params);

    const result: AccountingExportRow[] = [];

    for (const row of rows) {
      const clientLabel = row.client_name ?? row.company ?? row.name;
      const paymentMode =
        typeof row.metadata?.paymentMode === "string"
          ? row.metadata.paymentMode
          : typeof row.metadata?.cinetpayProcessedTransactions !== "undefined"
            ? "cinetpay"
            : row.paid_amount > 0
              ? "manuel"
              : null;

      result.push({
        type: "invoice",
        reference: row.reference,
        date: row.created_at.toISOString().slice(0, 10),
        clientName: clientLabel,
        company: row.company,
        subtotal: row.subtotal,
        tvaRate: Number(row.tva_rate),
        tvaAmount: row.tva_amount,
        total: row.total,
        paidAmount: row.paid_amount,
        status: row.status,
        paymentMode,
      });

      if (row.paid_amount > 0 && row.paid_at) {
        result.push({
          type: "payment",
          reference: `${row.reference}-PAY`,
          date: row.paid_at.toISOString().slice(0, 10),
          clientName: clientLabel,
          company: row.company,
          subtotal: 0,
          tvaRate: Number(row.tva_rate),
          tvaAmount: 0,
          total: row.paid_amount,
          paidAmount: row.paid_amount,
          status: "paid",
          paymentMode,
        });
      }
    }

    return result;
  });
}

export function buildAccountingCsv(rows: AccountingExportRow[]): string {
  const header = [
    "Type",
    "Référence",
    "Date",
    "Client",
    "Société",
    "HT",
    "TVA %",
    "TVA",
    "TTC",
    "Payé",
    "Statut",
    "Mode paiement",
  ].join(",");

  const lines = rows.map((r) =>
    [
      r.type === "invoice" ? "Facture" : "Paiement",
      r.reference,
      r.date,
      r.clientName,
      r.company ?? "",
      r.subtotal,
      r.tvaRate,
      r.tvaAmount,
      r.total,
      r.paidAmount,
      r.status,
      r.paymentMode ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [header, ...lines].join("\n");
}
