"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CREDIT_NOTE_STATUS_LABELS,
  formatCreditNoteAmount,
} from "@/content/credit-notes-labels";
import { formatInvoiceAmount } from "@/content/invoices-labels";
import type { Invoice } from "@/lib/invoices";
import { fetchInvoices } from "@/lib/invoices-api";
import type { CreditNote } from "@/lib/credit-notes";
import {
  createCreditNoteApi,
  fetchCreditNotes,
  updateCreditNoteApi,
} from "@/lib/credit-notes-api";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmCreditNotesPanel() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ invoiceId: "", amount: "", reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [notesData, invoicesData] = await Promise.all([fetchCreditNotes(), fetchInvoices()]);
      setNotes(notesData);
      setInvoices(invoicesData.filter((i) => i.total > i.paidAmount && i.status !== "cancelled"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const invoice = invoices.find((i) => i.id === form.invoiceId);
      const amount = Number(form.amount);
      if (!invoice || !amount) throw new Error("Facture et montant requis.");
      const created = await createCreditNoteApi({
        invoiceId: form.invoiceId,
        amount,
        reason: form.reason || undefined,
      });
      setNotes((prev) => [created, ...prev]);
      setShowCreate(false);
      setForm({ invoiceId: "", amount: "", reason: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(note: CreditNote, status: "issued" | "applied") {
    setSaving(true);
    try {
      const updated = await updateCreditNoteApi(note.id, { status });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Avoirs & notes de crédit</h2>
          <p className="text-sm text-gray-text">
            Liés à une facture, impactent le solde client à l&apos;application.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouvel avoir
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-gray/50 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-semibold">Créer un avoir</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Facture liée</span>
              <select
                className={fieldClass}
                value={form.invoiceId}
                onChange={(e) => setForm((f) => ({ ...f, invoiceId: e.target.value }))}
                required
              >
                <option value="">Sélectionner…</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.reference} — {inv.name} (reste {formatInvoiceAmount(inv.total - inv.paidAmount)})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Montant (FCFA)</span>
              <input
                type="number"
                className={fieldClass}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                min={1}
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Motif</span>
              <input
                className={fieldClass}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex. remise commerciale, erreur de facturation…"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
              {saving ? "Création…" : "Créer"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray/50 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray/30 text-left text-xs uppercase tracking-wide text-gray-text">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Facture</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-text">
                  Aucun avoir pour le moment.
                </td>
              </tr>
            ) : (
              notes.map((note) => (
                <tr key={note.id} className="border-b border-gray/30 last:border-0">
                  <td className="px-4 py-3 font-medium">{note.reference}</td>
                  <td className="px-4 py-3">{note.invoiceReference ?? "—"}</td>
                  <td className="px-4 py-3">{note.clientName ?? "—"}</td>
                  <td className="px-4 py-3">{formatCreditNoteAmount(note.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", note.status === "applied" ? "bg-green-100 text-green-700" : "bg-gray/40")}>
                      {CREDIT_NOTE_STATUS_LABELS[note.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {note.status === "draft" && (
                        <button type="button" onClick={() => void handleStatus(note, "issued")} className="text-xs text-primary hover:underline">
                          Émettre
                        </button>
                      )}
                      {note.status === "issued" && (
                        <button type="button" onClick={() => void handleStatus(note, "applied")} className="text-xs text-primary hover:underline">
                          Appliquer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
