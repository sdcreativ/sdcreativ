"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Receipt } from "lucide-react";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
} from "@/content/invoices-labels";
import { cn } from "@/lib/utils";

type InvoiceSummary = {
  id: string;
  reference: string;
  quoteId: string | null;
  total: number;
  paidAmount: number;
  remaining: number;
  status: string;
  statusLabel: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  downloadUrl: string | null;
};

type InvoiceDetail = InvoiceSummary & {
  name: string;
  company: string | null;
  lines: Array<{ label: string; amount: number }>;
  subtotal: number;
  tvaRate: number;
  tvaAmount: number;
  formattedTotal: string;
  formattedRemaining: string;
};

function statusTone(status: string): string {
  if (status === "paid") return "bg-emerald-100 text-emerald-800";
  if (status === "overdue") return "bg-accent/10 text-accent";
  if (status === "sent") return "bg-sky-100 text-sky-800";
  return "bg-gray-light text-gray-text";
}

export function ClientPortalInvoicesView() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/espace-client/invoices", { credentials: "include" });
      const json = (await res.json()) as { invoices?: InvoiceSummary[]; error?: string };
      if (!res.ok) throw new Error(json.error);
      setInvoices(json.invoices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/espace-client/invoices/${id}`, { credentials: "include" });
      const json = (await res.json()) as { invoice?: InvoiceDetail; error?: string };
      if (!res.ok) throw new Error(json.error);
      setDetail(json.invoice ?? null);
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : "Facture introuvable.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement de vos factures…
      </div>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-8 text-center text-sm text-accent">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Vos factures</h2>
        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray/50 bg-white px-5 py-10 text-center">
            <Receipt className="mx-auto h-8 w-8 text-gray-text/50" aria-hidden />
            <p className="mt-3 text-sm text-gray-text">Aucune facture disponible pour le moment.</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <button
              key={invoice.id}
              type="button"
              onClick={() => setSelectedId(invoice.id)}
              className={cn(
                "w-full rounded-2xl border bg-white px-4 py-4 text-left transition hover:border-primary/30 hover:shadow-sm",
                selectedId === invoice.id ? "border-primary/40 ring-2 ring-primary/10" : "border-gray/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{invoice.reference}</p>
                  <p className="mt-1 text-sm text-gray-text">
                    {formatInvoiceAmount(invoice.total)}
                    {invoice.dueDate ? ` · Échéance ${formatInvoiceDate(invoice.dueDate)}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    statusTone(invoice.status),
                  )}
                >
                  {invoice.statusLabel}
                </span>
              </div>
              {invoice.remaining > 0 && invoice.status !== "paid" && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Reste dû : {formatInvoiceAmount(invoice.remaining)}
                </p>
              )}
            </button>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-gray/40 bg-white">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-sm text-gray-text">
            <Receipt className="mb-3 h-8 w-8 text-gray-text/40" aria-hidden />
            Sélectionnez une facture pour voir le détail.
          </div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement…
          </div>
        ) : detail ? (
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{detail.reference}</h3>
                <p className="mt-1 text-sm text-gray-text">
                  Émise le {formatInvoiceDate(detail.sentAt ?? detail.dueDate)}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  statusTone(detail.status),
                )}
              >
                {detail.statusLabel}
              </span>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-gray/40">
              <table className="w-full text-sm">
                <thead className="bg-gray-light/60 text-left text-xs uppercase tracking-wide text-gray-text">
                  <tr>
                    <th className="px-4 py-2.5">Prestation</th>
                    <th className="px-4 py-2.5 text-right">Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line) => (
                    <tr key={line.label} className="border-t border-gray/30">
                      <td className="px-4 py-3">{line.label}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatInvoiceAmount(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 text-right text-sm">
              <p>Sous-total HT : {formatInvoiceAmount(detail.subtotal)}</p>
              <p>TVA ({detail.tvaRate} %) : {formatInvoiceAmount(detail.tvaAmount)}</p>
              <p className="text-base font-bold text-primary">Total TTC : {detail.formattedTotal}</p>
              {detail.remaining > 0 && (
                <p className="font-semibold text-amber-700">
                  Reste dû : {detail.formattedRemaining}
                </p>
              )}
            </div>

            {detail.dueDate && (
              <p className="mt-4 text-sm text-gray-text">
                Date d&apos;échéance : <strong>{formatInvoiceDate(detail.dueDate)}</strong>
              </p>
            )}

            {detail.downloadUrl && (
              <a
                href={detail.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                <Download className="h-4 w-4" aria-hidden />
                Télécharger le PDF
              </a>
            )}
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-sm text-gray-text">
            Impossible de charger cette facture.
          </div>
        )}
      </div>
    </div>
  );
}
