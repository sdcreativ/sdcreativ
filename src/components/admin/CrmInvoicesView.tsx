"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  INVOICE_PIPELINE_COLUMNS,
  INVOICE_STATUS_LABELS,
  formatInvoiceAmount,
  formatInvoiceDate,
  statusStyles,
  type InvoiceStatus,
} from "@/content/invoices-labels";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Client } from "@/lib/clients";
import type { Invoice } from "@/lib/invoices";
import {
  createInvoiceApi,
  deleteInvoiceApi,
  fetchInvoiceStats,
  fetchInvoices,
  getInvoicePdfUrl,
  updateInvoiceApi,
} from "@/lib/invoices-api";
import { fetchProjects } from "@/lib/projects-api";
import type { Project } from "@/lib/projects";
import {
  CURRENCY_LABELS,
  normalizeCurrency,
  suggestedRateToXof,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currencies";
import { fetchQuotes } from "@/lib/quotes-api";
import type { Quote } from "@/lib/quotes";
import { InvoiceEmailComposer } from "@/components/admin/InvoiceEmailComposer";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  Download,
  Loader2,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmInvoicesView() {
  const { confirm } = useDialog();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, paid: 0, overdue: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, statsData, quotesData, projectsData] = await Promise.all([
        fetchInvoices(),
        fetchInvoiceStats(),
        fetchQuotes(),
        fetchProjects(),
      ]);
      setInvoices(data);
      setStats(statsData);
      setQuotes(quotesData);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les factures.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(invoice: Invoice, status: InvoiceStatus) {
    setSaving(true);
    try {
      const updated = await updateInvoiceApi(invoice.id, { status });
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
      setStats(await fetchInvoiceStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer la facture",
      message: "Supprimer cette facture ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteInvoiceApi(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      setSelected(null);
      setStats(await fetchInvoiceStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  const activeInvoices = invoices.filter((i) => i.status !== "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          Facturation structurée — numérotation, TVA, statuts et suivi des encaissements.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle facture
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={String(stats.total)} />
        <StatCard label="Envoyées" value={String(stats.sent)} />
        <StatCard label="Payées" value={String(stats.paid)} />
        <StatCard label="Encours" value={formatInvoiceAmount(stats.totalOutstanding)} highlight />
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : activeInvoices.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <Receipt className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucune facture</p>
          <p className="mt-1 text-sm text-gray-text">Créez une facture ou convertissez un devis accepté.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {INVOICE_PIPELINE_COLUMNS.map(({ status, title }) => {
            const column = activeInvoices.filter((i) => i.status === status);
            return (
              <div key={status} className="w-72 shrink-0 rounded-xl border border-gray/40 bg-gray-light/50 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold tracking-wide text-gray-text">{title}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">{column.length}</span>
                </div>
                <div className="space-y-2">
                  {column.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      onOpen={() => setSelected(invoice)}
                      onStatusChange={(s) => void handleStatusChange(invoice, s)}
                      disabled={saving}
                    />
                  ))}
                  {column.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-gray-text">Aucune facture</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <InvoiceDetailPanel
          invoice={selected}
          saving={saving}
          quotes={quotes}
          projects={projects}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setSelected(updated);
            void fetchInvoiceStats().then(setStats);
          }}
          onEmailSent={async () => {
            const data = await fetchInvoices();
            setInvoices(data);
            setSelected((prev) => (prev ? data.find((i) => i.id === prev.id) ?? prev : null));
            setStats(await fetchInvoiceStats());
          }}
          onDelete={() => void handleDelete(selected.id)}
        />
      )}

      {showCreate && (
        <CreateInvoiceModal
          quotes={quotes}
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={(invoice) => {
            setInvoices((prev) => [invoice, ...prev]);
            setShowCreate(false);
            void fetchInvoiceStats().then(setStats);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-gray/40 bg-white p-4 shadow-sm", highlight && "border-primary/30")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", highlight ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

function InvoiceCard({
  invoice,
  onOpen,
  onStatusChange,
  disabled,
}: {
  invoice: Invoice;
  onOpen: () => void;
  onStatusChange: (status: InvoiceStatus) => void;
  disabled: boolean;
}) {
  const remaining = invoice.total - invoice.paidAmount;
  return (
    <article className="rounded-xl border border-gray/40 bg-white p-3 shadow-sm hover:shadow-md">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <p className="font-mono text-[10px] font-semibold text-primary">{invoice.reference}</p>
        <h3 className="truncate text-sm font-bold text-foreground">{invoice.name}</h3>
        <p className="mt-1 text-sm font-bold text-primary">
          {formatInvoiceAmount(invoice.total, invoice.currency)}
        </p>
        {remaining > 0 && invoice.status !== "paid" && (
          <p className="mt-0.5 text-[10px] text-accent">
            Reste {formatInvoiceAmount(remaining, invoice.currency)}
          </p>
        )}
        {invoice.dueDate && (
          <p className="mt-1 text-[10px] text-gray-text">Échéance {formatInvoiceDate(invoice.dueDate)}</p>
        )}
      </button>
      <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-gray-text">
        Statut
        <select
          value={invoice.status}
          disabled={disabled}
          onChange={(e) => onStatusChange(e.target.value as InvoiceStatus)}
          className="mt-1 w-full rounded-lg border border-gray/50 px-2 py-1.5 text-xs"
          aria-label={`Statut de la facture ${invoice.reference}`}
        >
          {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
    </article>
  );
}

function InvoiceDetailPanel({
  invoice,
  saving,
  quotes,
  projects,
  onClose,
  onUpdated,
  onEmailSent,
  onDelete,
}: {
  invoice: Invoice;
  saving: boolean;
  quotes: Quote[];
  projects: Project[];
  onClose: () => void;
  onUpdated: (invoice: Invoice) => void;
  onEmailSent: () => void | Promise<void>;
  onDelete: () => void;
}) {
  const [paidAmount, setPaidAmount] = useState(String(invoice.paidAmount));
  const [showEmail, setShowEmail] = useState(false);

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);
  const linkedQuote = invoice.quoteId ? quotes.find((q) => q.id === invoice.quoteId) : null;
  const linkedProject = invoice.projectId ? projects.find((p) => p.id === invoice.projectId) : null;

  async function handleSavePayment() {
    const amount = Number(paidAmount);
    const updated = await updateInvoiceApi(invoice.id, { paidAmount: amount });
    onUpdated(updated);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
        <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
            <div>
              <p className="font-mono text-xs font-semibold text-primary">{invoice.reference}</p>
              <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", statusStyles[invoice.status])}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </span>
              <h2 className="mt-2 font-bold text-foreground">{invoice.name}</h2>
              {invoice.company && <p className="text-sm text-gray-text">{invoice.company}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-light" aria-label="Fermer">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
            <label className="block" htmlFor={`invoice-status-${invoice.id}`}>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
              <select
                id={`invoice-status-${invoice.id}`}
                value={invoice.status}
                disabled={saving}
                onChange={(e) => void updateInvoiceApi(invoice.id, { status: e.target.value }).then(onUpdated)}
                className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
                aria-label={`Statut de la facture ${invoice.reference}`}
              >
                {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {(linkedQuote || linkedProject) && (
              <dl className="grid gap-3 rounded-xl border border-gray/40 bg-gray-light/40 p-3 sm:grid-cols-2">
                {linkedQuote && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Devis lié</dt>
                    <dd className="mt-0.5">
                      <Link href="/admin/crm/devis" className="font-mono text-sm font-semibold text-primary hover:underline">
                        {linkedQuote.reference}
                      </Link>
                    </dd>
                  </div>
                )}
                {linkedProject && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Projet lié</dt>
                    <dd className="mt-0.5">
                      <Link href={`/admin/crm/projets/${linkedProject.id}`} className="font-medium text-primary hover:underline">
                        {linkedProject.name}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary-light/30 p-4">
              <p className="text-2xl font-bold text-primary">
                {formatInvoiceAmount(invoice.total, invoice.currency)}
              </p>
              <p className="mt-1 text-xs text-gray-text">
                HT {formatInvoiceAmount(invoice.subtotal, invoice.currency)} + TVA {invoice.tvaRate} % (
                {formatInvoiceAmount(invoice.tvaAmount, invoice.currency)})
              </p>
              <p className="mt-1 text-xs text-gray-text">
                Devise : {CURRENCY_LABELS[normalizeCurrency(invoice.currency)]}
                {invoice.exchangeRateToXof
                  ? ` · 1 ${invoice.currency} = ${invoice.exchangeRateToXof.toLocaleString("fr-FR")} XOF`
                  : ""}
              </p>
              {invoice.dueDate && (
                <p className="mt-2 text-xs text-gray-text">Échéance : {formatInvoiceDate(invoice.dueDate)}</p>
              )}
            </div>

            <div className={cn(
              "rounded-xl border p-4",
              remaining > 0 ? "border-accent/30 bg-accent/5" : "border-green-200 bg-green-50",
            )}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Encaissement</p>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-text">Payé</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatInvoiceAmount(invoice.paidAmount, invoice.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-text">Reste dû</p>
                  <p className={cn("text-lg font-bold", remaining > 0 ? "text-accent" : "text-green-700")}>
                    {formatInvoiceAmount(remaining, invoice.currency)}
                  </p>
                </div>
              </div>
            </div>

            {invoice.lines.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-gray-light/60 p-3">
                {invoice.lines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-gray-text">{line.label}</span>
                    <span className="font-medium">
                      {formatInvoiceAmount(line.amount, invoice.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <label className="block" htmlFor={`invoice-paid-${invoice.id}`}>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
                Montant payé ({invoice.currency})
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  id={`invoice-paid-${invoice.id}`}
                  type="number"
                  min={0}
                  max={invoice.total}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className={fieldClass}
                  placeholder="0"
                  aria-label={`Montant payé pour la facture ${invoice.reference}`}
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSavePayment()}
                  className="shrink-0 rounded-xl bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </label>
          </div>

          <div className="flex gap-2 border-t border-gray/40 px-5 py-4">
            <a
              href={getInvoicePdfUrl(invoice.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/30"
            >
              <Download className="h-4 w-4" aria-hidden />
              PDF
            </a>
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray/60 py-2.5 text-sm font-medium hover:bg-gray-light"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              aria-label="Supprimer"
              className="inline-flex items-center justify-center rounded-xl border border-accent/30 px-4 py-2.5 text-accent hover:bg-accent/5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {showEmail && (
        <InvoiceEmailComposer
          invoiceId={invoice.id}
          invoiceReference={invoice.reference}
          invoiceEmail={invoice.email}
          invoiceName={invoice.name}
          invoiceTotal={invoice.total}
          invoiceCurrency={invoice.currency}
          onClose={() => setShowEmail(false)}
          onSent={() => void onEmailSent()}
        />
      )}
    </>
  );
}

function CreateInvoiceModal({
  quotes,
  projects,
  onClose,
  onCreated,
}: {
  quotes: Quote[];
  projects: Project[];
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<SupportedCurrency>("XOF");
  const [exchangeRate, setExchangeRate] = useState("");

  useEffect(() => {
    void fetchCrmClients().then(setClients).catch(() => setClients([]));
  }, []);

  function fillFromQuote(form: HTMLFormElement, quoteId: string) {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;
    (form.elements.namedItem("name") as HTMLInputElement).value = quote.name;
    (form.elements.namedItem("email") as HTMLInputElement).value = quote.email;
    (form.elements.namedItem("company") as HTMLInputElement).value = quote.company ?? "";
    if (quote.clientId) {
      (form.elements.namedItem("clientId") as HTMLSelectElement).value = quote.clientId;
    }
    const subtotal = quote.lines.reduce((sum, line) => sum + line.amount, 0) || quote.subtotal;
    (form.elements.namedItem("subtotal") as HTMLInputElement).value = String(subtotal);
    if (quote.lines[0]) {
      (form.elements.namedItem("lineLabel") as HTMLInputElement).value = quote.lines[0].label;
    }
    const quoteCurrency = normalizeCurrency(quote.currency);
    setCurrency(quoteCurrency);
    setExchangeRate(
      quote.exchangeRateToXof != null
        ? String(quote.exchangeRateToXof)
        : suggestedRateToXof(quoteCurrency) != null
          ? String(suggestedRateToXof(quoteCurrency))
          : "",
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const subtotal = Number(data.get("subtotal") || 0);
    const tvaRate = Number(data.get("tvaRate") || 18);
    const clientId = String(data.get("clientId") || "");
    const projectId = String(data.get("projectId") || "");
    const quoteId = String(data.get("quoteId") || "");

    try {
      const invoice = await createInvoiceApi({
        clientId: clientId || null,
        projectId: projectId || null,
        quoteId: quoteId || null,
        name: String(data.get("name")),
        email: String(data.get("email")),
        company: String(data.get("company") || "") || null,
        lines: [{ label: String(data.get("lineLabel") || "Prestation"), amount: subtotal }],
        tvaRate,
        status: String(data.get("status") || "draft"),
        dueDate: String(data.get("dueDate") || "") || null,
        currency,
        exchangeRateToXof:
          currency === "XOF"
            ? null
            : Number(exchangeRate) || suggestedRateToXof(currency),
      });
      onCreated(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Nouvelle facture</h2>
          <button type="button" onClick={onClose} aria-label="Fermer"><X className="h-5 w-5 text-gray-text" aria-hidden /></button>
        </div>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Devis lié (optionnel)</span>
            <select
              name="quoteId"
              className={fieldClass}
              aria-label="Devis lié"
              onChange={(e) => {
                const form = e.target.form;
                if (form && e.target.value) fillFromQuote(form, e.target.value);
              }}
            >
              <option value="">— Aucun —</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>{q.reference} — {q.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Projet lié (optionnel)</span>
            <select name="projectId" className={fieldClass} aria-label="Projet lié">
              <option value="">— Aucun —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Client (optionnel)</span>
            <select
              name="clientId"
              className={fieldClass}
              aria-label="Client"
              onChange={(e) => {
            const client = clients.find((c) => c.id === e.target.value);
            if (!client) return;
            const form = e.target.form;
            if (!form) return;
            (form.elements.namedItem("name") as HTMLInputElement).value = client.name;
            (form.elements.namedItem("email") as HTMLInputElement).value = client.email;
            (form.elements.namedItem("company") as HTMLInputElement).value = client.company ?? "";
          }}
            >
              <option value="">— Aucun —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company || c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Nom du contact *</span>
            <input name="name" required placeholder="Nom du contact" className={fieldClass} aria-label="Nom du contact" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Email *</span>
            <input name="email" type="email" required placeholder="Email" className={fieldClass} aria-label="Email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Entreprise</span>
            <input name="company" placeholder="Entreprise" className={fieldClass} aria-label="Entreprise" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Libellé de la ligne</span>
            <input name="lineLabel" defaultValue="Prestation" placeholder="Libellé" className={fieldClass} aria-label="Libellé de la ligne" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Montant HT *</span>
            <input name="subtotal" type="number" min={0} required placeholder="Montant HT" className={fieldClass} aria-label="Montant HT" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Devise</span>
            <select
              name="currency"
              value={currency}
              onChange={(e) => {
                const next = normalizeCurrency(e.target.value);
                setCurrency(next);
                const suggested = suggestedRateToXof(next);
                setExchangeRate(suggested != null ? String(suggested) : "");
              }}
              className={fieldClass}
              aria-label="Devise"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          {currency !== "XOF" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">
                Taux figé (1 {currency} = ? XOF)
              </span>
              <input
                type="number"
                min={0.000001}
                step="any"
                required
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className={fieldClass}
                aria-label="Taux de change figé vers XOF"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">TVA (%)</span>
            <input name="tvaRate" type="number" min={0} max={100} defaultValue={18} placeholder="TVA" className={fieldClass} aria-label="Taux de TVA en pourcentage" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Date d&apos;échéance</span>
            <input name="dueDate" type="date" className={fieldClass} aria-label="Date d'échéance" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Statut initial</span>
            <select name="status" defaultValue="draft" className={fieldClass} aria-label="Statut initial">
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
            </select>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={loading} className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {loading ? "Création…" : "Créer la facture"}
        </button>
      </form>
    </div>
  );
}
