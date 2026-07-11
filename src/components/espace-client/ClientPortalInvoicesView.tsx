"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Download, Loader2, Receipt } from "lucide-react";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
} from "@/content/invoices-labels";
import type { PaymentInstructionsPayload } from "@/lib/payment-settings-types";
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
  payment: PaymentInstructionsPayload | null;
};

function statusTone(status: string): string {
  if (status === "paid") return "bg-emerald-100 text-emerald-800";
  if (status === "overdue") return "bg-accent/10 text-accent";
  if (status === "sent") return "bg-sky-100 text-sky-800";
  return "bg-gray-light text-gray-text";
}

function PaymentInstructionsPanel({ payment }: { payment: PaymentInstructionsPayload }) {
  const hasBank = Boolean(payment.bankName || payment.iban);
  const hasMomo = Boolean(
    payment.orangeMoneyNumber || payment.waveNumber || payment.mtnMomoNumber,
  );

  return (
    <div className="mt-6 rounded-xl border border-gray/40 bg-gray-light/30 p-4">
      <h4 className="text-sm font-bold text-foreground">Modalités de règlement</h4>
      <p className="mt-2 text-sm text-gray-text">
        Montant à régler : <strong className="text-foreground">{payment.formattedAmountDue}</strong>
      </p>
      <p className="mt-1 text-sm text-gray-text">
        Référence obligatoire : <strong className="font-mono text-foreground">{payment.referenceLabel}</strong>
      </p>

      {hasBank && (
        <div className="mt-4 text-sm">
          <p className="font-semibold text-primary">Virement bancaire</p>
          {payment.accountHolder && <p className="mt-1 text-gray-text">Titulaire : {payment.accountHolder}</p>}
          {payment.bankName && <p className="text-gray-text">Banque : {payment.bankName}</p>}
          {payment.iban && <p className="font-mono text-gray-text">IBAN / RIB : {payment.iban}</p>}
          {payment.bic && <p className="text-gray-text">BIC : {payment.bic}</p>}
        </div>
      )}

      {hasMomo && (
        <div className="mt-4 text-sm">
          <p className="font-semibold text-primary">Mobile Money</p>
          {payment.orangeMoneyNumber && (
            <p className="mt-1 text-gray-text">Orange Money : {payment.orangeMoneyNumber}</p>
          )}
          {payment.waveNumber && <p className="text-gray-text">Wave : {payment.waveNumber}</p>}
          {payment.mtnMomoNumber && <p className="text-gray-text">MTN MoMo : {payment.mtnMomoNumber}</p>}
        </div>
      )}

      {payment.paymentNote.trim() && (
        <p className="mt-4 text-xs leading-relaxed text-gray-text">{payment.paymentNote.trim()}</p>
      )}
    </div>
  );
}

export function ClientPortalInvoicesView() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [paymentReturnNotice, setPaymentReturnNotice] = useState<string | null>(null);

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
    setPayError("");
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
    const invoiceParam = searchParams.get("invoice");
    if (invoiceParam) setSelectedId(invoiceParam);
  }, [searchParams]);

  useEffect(() => {
    const paymentReturn = searchParams.get("payment");
    if (paymentReturn === "return") {
      setPaymentReturnNotice(
        "Votre paiement est en cours de confirmation. Le statut de la facture sera mis à jour sous quelques minutes.",
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function handlePayOnline() {
    if (!selectedId || !detail?.payment?.onlineAvailable) return;
    setPayLoading(true);
    setPayError("");
    try {
      const res = await fetch(`/api/espace-client/invoices/${selectedId}/pay`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { paymentUrl?: string; error?: string };
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error ?? "Paiement indisponible.");
      }
      window.location.href = json.paymentUrl;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Impossible d'ouvrir le paiement.");
      setPayLoading(false);
    }
  }

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
    <div className="space-y-4">
      {paymentReturnNotice && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {paymentReturnNotice}
        </p>
      )}

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

              {detail.payment && <PaymentInstructionsPanel payment={detail.payment} />}

              {payError && (
                <p className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
                  {payError}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {detail.payment?.onlineAvailable && (
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() => void handlePayOnline()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {payLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <CreditCard className="h-4 w-4" aria-hidden />
                    )}
                    Payer en ligne — {detail.payment.formattedAmountDue}
                  </button>
                )}

                {detail.downloadUrl && (
                  <a
                    href={detail.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-light/20 py-3 text-sm font-semibold text-primary hover:bg-primary-light/40"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Télécharger le PDF
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-gray-text">
              Impossible de charger cette facture.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
