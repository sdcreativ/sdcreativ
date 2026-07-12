"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SUBSCRIPTION_INTERVAL_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/content/subscriptions-labels";
import { formatInvoiceAmount } from "@/content/invoices-labels";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Subscription } from "@/lib/subscriptions";
import {
  createSubscriptionApi,
  fetchSubscriptions,
  updateSubscriptionApi,
} from "@/lib/subscriptions-api";
import { Loader2, Plus } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmSubscriptionsPanel() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    title: "",
    amount: "",
    interval: "monthly",
    nextBillingDate: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, clientsData] = await Promise.all([fetchSubscriptions(), fetchCrmClients()]);
      setSubscriptions(subs);
      setClients(clientsData.map((c) => ({ id: c.id, name: c.name })));
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
    try {
      const created = await createSubscriptionApi({
        clientId: form.clientId,
        title: form.title,
        amount: Number(form.amount),
        interval: form.interval,
        nextBillingDate: form.nextBillingDate,
      });
      setSubscriptions((prev) => [created, ...prev]);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  async function togglePause(sub: Subscription) {
    const status = sub.status === "active" ? "paused" : "active";
    const updated = await updateSubscriptionApi(sub.id, { status });
    setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
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
          <h2 className="text-lg font-bold">Abonnements & maintenance</h2>
          <p className="text-sm text-gray-text">
            Facturation récurrente automatique (cron quotidien).
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden />
          Nouvel abonnement
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Client</span>
              <select className={fieldClass} value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} required>
                <option value="">Sélectionner…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Intitulé</span>
              <input className={fieldClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Montant (FCFA)</span>
              <input type="number" className={fieldClass} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Fréquence</span>
              <select className={fieldClass} value={form.interval} onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}>
                <option value="monthly">Mensuel</option>
                <option value="yearly">Annuel</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Prochaine facturation</span>
              <input type="date" className={fieldClass} value={form.nextBillingDate} onChange={(e) => setForm((f) => ({ ...f, nextBillingDate: e.target.value }))} required />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Créer</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray/30 text-left text-xs uppercase text-gray-text">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Intitulé</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Fréquence</th>
              <th className="px-4 py-3">Prochaine facture</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="border-b last:border-0">
                <td className="px-4 py-3">{sub.clientName}</td>
                <td className="px-4 py-3 font-medium">{sub.title}</td>
                <td className="px-4 py-3">{formatInvoiceAmount(sub.amount)}</td>
                <td className="px-4 py-3">{SUBSCRIPTION_INTERVAL_LABELS[sub.interval]}</td>
                <td className="px-4 py-3">{sub.nextBillingDate}</td>
                <td className="px-4 py-3">{SUBSCRIPTION_STATUS_LABELS[sub.status]}</td>
                <td className="px-4 py-3">
                  {sub.status !== "cancelled" && (
                    <button type="button" onClick={() => void togglePause(sub)} className="text-xs text-primary hover:underline">
                      {sub.status === "active" ? "Pause" : "Réactiver"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
