import {
  getAccountingExportRows,
  type AccountingExportFilters,
  type AccountingExportRow,
} from "@/lib/accounting-export";
import { withDb } from "@/lib/db";

/**
 * Export type FEC (écriture simplifiée) adapté comptabilité CI / SYSCOHADA.
 * Journal VE = ventes ; OD = encaissements.
 * Comptes indicatifs : 411 clients, 701 ventes, 4431 TVA collectée, 521 banque.
 */
export type FecLine = {
  journalCode: string;
  journalLib: string;
  ecritureNum: string;
  ecritureDate: string;
  compteNum: string;
  compteLib: string;
  pieceRef: string;
  pieceDate: string;
  ecritureLib: string;
  debit: number;
  credit: number;
  devise: string;
  montantDevise: number | null;
  legalEntityCode: string | null;
};

export type AccountingExportFiltersExt = AccountingExportFilters & {
  legalEntityId?: string;
};

function padDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function money(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export async function getAccountingExportRowsEnriched(
  filters?: AccountingExportFiltersExt,
): Promise<
  Array<
    AccountingExportRow & {
      currency: string;
      exchangeRateToXof: number | null;
      legalEntityCode: string | null;
      totalXof: number | null;
    }
  >
> {
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
    if (filters?.legalEntityId) {
      params.push(filters.legalEntityId);
      clauses.push(`i.legal_entity_id = $${params.length}`);
    }

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
      currency: string | null;
      exchange_rate_to_xof: string | number | null;
      entity_code: string | null;
    }>(
      `SELECT i.reference, i.created_at, i.paid_at, i.name, i.company,
              c.name AS client_name, i.subtotal, i.tva_rate, i.tva_amount,
              i.total, i.paid_amount, i.status, i.metadata,
              i.currency, i.exchange_rate_to_xof,
              le.slug AS entity_code
       FROM invoices i
       LEFT JOIN clients c ON c.id = i.client_id
       LEFT JOIN legal_entities le ON le.id = i.legal_entity_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY i.created_at ASC`,
      params,
    );

    return rows.map((row) => {
      const currency = (row.currency ?? "XOF").toUpperCase();
      const rate =
        row.exchange_rate_to_xof != null ? Number(row.exchange_rate_to_xof) : null;
      const totalXof =
        currency === "XOF" ? row.total : rate && rate > 0 ? Math.round(row.total * rate) : null;
      const paymentMode =
        typeof row.metadata?.paymentMode === "string"
          ? row.metadata.paymentMode
          : row.paid_amount > 0
            ? "manuel"
            : null;

      return {
        type: "invoice" as const,
        reference: row.reference,
        date: row.created_at.toISOString().slice(0, 10),
        clientName: row.client_name ?? row.company ?? row.name,
        company: row.company,
        subtotal: row.subtotal,
        tvaRate: Number(row.tva_rate),
        tvaAmount: row.tva_amount,
        total: row.total,
        paidAmount: row.paid_amount,
        status: row.status,
        paymentMode,
        currency,
        exchangeRateToXof: rate,
        legalEntityCode: row.entity_code,
        totalXof,
      };
    });
  });
}

export function buildFecLines(
  rows: Awaited<ReturnType<typeof getAccountingExportRowsEnriched>>,
): FecLine[] {
  const lines: FecLine[] = [];

  for (const row of rows) {
    if (row.type !== "invoice") continue;
    const date = padDate(row.date);
    const ht = row.subtotal;
    const tva = row.tvaAmount;
    const ttc = row.total;
    const devise = row.currency;
    const entity = row.legalEntityCode;

    lines.push({
      journalCode: "VE",
      journalLib: "Ventes",
      ecritureNum: row.reference,
      ecritureDate: date,
      compteNum: "411000",
      compteLib: "Clients",
      pieceRef: row.reference,
      pieceDate: date,
      ecritureLib: `Facture ${row.reference} — ${row.clientName}`,
      debit: ttc,
      credit: 0,
      devise,
      montantDevise: devise === "XOF" ? null : ttc,
      legalEntityCode: entity,
    });
    lines.push({
      journalCode: "VE",
      journalLib: "Ventes",
      ecritureNum: row.reference,
      ecritureDate: date,
      compteNum: "701000",
      compteLib: "Ventes de prestations",
      pieceRef: row.reference,
      pieceDate: date,
      ecritureLib: `Facture ${row.reference} HT`,
      debit: 0,
      credit: ht,
      devise,
      montantDevise: devise === "XOF" ? null : ht,
      legalEntityCode: entity,
    });
    if (tva > 0) {
      lines.push({
        journalCode: "VE",
        journalLib: "Ventes",
        ecritureNum: row.reference,
        ecritureDate: date,
        compteNum: "443100",
        compteLib: "TVA collectée",
        pieceRef: row.reference,
        pieceDate: date,
        ecritureLib: `TVA ${row.tvaRate}% ${row.reference}`,
        debit: 0,
        credit: tva,
        devise,
        montantDevise: devise === "XOF" ? null : tva,
        legalEntityCode: entity,
      });
    }

    if (row.paidAmount > 0) {
      const payDate = date;
      lines.push({
        journalCode: "OD",
        journalLib: "Opérations diverses",
        ecritureNum: `${row.reference}-PAY`,
        ecritureDate: payDate,
        compteNum: "521000",
        compteLib: "Banque",
        pieceRef: `${row.reference}-PAY`,
        pieceDate: payDate,
        ecritureLib: `Encaissement ${row.reference}`,
        debit: row.paidAmount,
        credit: 0,
        devise,
        montantDevise: devise === "XOF" ? null : row.paidAmount,
        legalEntityCode: entity,
      });
      lines.push({
        journalCode: "OD",
        journalLib: "Opérations diverses",
        ecritureNum: `${row.reference}-PAY`,
        ecritureDate: payDate,
        compteNum: "411000",
        compteLib: "Clients",
        pieceRef: `${row.reference}-PAY`,
        pieceDate: payDate,
        ecritureLib: `Règlement client ${row.reference}`,
        debit: 0,
        credit: row.paidAmount,
        devise,
        montantDevise: devise === "XOF" ? null : row.paidAmount,
        legalEntityCode: entity,
      });
    }
  }

  return lines;
}

/** Format FEC tabulé (norme FR adaptée SYSCOHADA / CI). */
export function buildFecTxt(lines: FecLine[]): string {
  const header = [
    "JournalCode",
    "JournalLib",
    "EcritureNum",
    "EcritureDate",
    "CompteNum",
    "CompteLib",
    "PieceRef",
    "PieceDate",
    "EcritureLib",
    "Debit",
    "Credit",
    "Idevise",
    "Montantdevise",
    "EntityCode",
  ].join("\t");

  const body = lines.map((l) =>
    [
      l.journalCode,
      l.journalLib,
      l.ecritureNum,
      l.ecritureDate,
      l.compteNum,
      l.compteLib,
      l.pieceRef,
      l.pieceDate,
      l.ecritureLib,
      money(l.debit),
      money(l.credit),
      l.devise === "XOF" ? "" : l.devise,
      l.montantDevise != null ? money(l.montantDevise) : "",
      l.legalEntityCode ?? "",
    ].join("\t"),
  );

  return [header, ...body].join("\n");
}

/** CSV comptable CI enrichi (XOF + entité + taux). */
export function buildCiAccountingCsv(
  rows: Awaited<ReturnType<typeof getAccountingExportRowsEnriched>>,
): string {
  const header = [
    "Référence",
    "Date",
    "Client",
    "Société",
    "HT",
    "TVA%",
    "TVA",
    "TTC",
    "Payé",
    "Statut",
    "Devise",
    "Taux_XOF",
    "TTC_XOF",
    "Entité",
    "Mode_paiement",
  ].join(";");

  const lines = rows.map((r) =>
    [
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
      r.currency,
      r.exchangeRateToXof ?? "",
      r.totalXof ?? "",
      r.legalEntityCode ?? "",
      r.paymentMode ?? "",
    ].join(";"),
  );

  return [header, ...lines].join("\n");
}

export async function buildAccountingExport(input: {
  format: "csv" | "fec" | "ci-csv" | "json";
  filters?: AccountingExportFiltersExt;
}): Promise<{ body: string; contentType: string; filename: string } | { rows: unknown[]; count: number }> {
  if (input.format === "csv") {
    const rows = await getAccountingExportRows(input.filters);
    const { buildAccountingCsv } = await import("@/lib/accounting-export");
    const body = buildAccountingCsv(rows);
    return {
      body,
      contentType: "text/csv; charset=utf-8",
      filename: `export-comptable-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  const enriched = await getAccountingExportRowsEnriched(input.filters);

  if (input.format === "json") {
    return { rows: enriched, count: enriched.length };
  }

  if (input.format === "fec") {
    const body = buildFecTxt(buildFecLines(enriched));
    return {
      body,
      contentType: "text/plain; charset=utf-8",
      filename: `FEC-SDCREATIV-${new Date().toISOString().slice(0, 10)}.txt`,
    };
  }

  const body = buildCiAccountingCsv(enriched);
  return {
    body,
    contentType: "text/csv; charset=utf-8",
    filename: `export-comptable-CI-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}
