"use client";

import { useEffect, useState } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { formatMoney } from "@/lib/currencies";
import type { SupportedCurrency } from "@/lib/currencies";

type Po = {
  id: string;
  reference: string;
  vendorName: string;
  projectName: string | null;
  amount: number;
  currency: SupportedCurrency;
  status: string;
  dueDate: string | null;
  description: string | null;
  deliverableNote: string | null;
  deliveredAt: string | null;
};

export function VendorPortalView({ token }: { token: string }) {
  const [po, setPo] = useState<Po | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/espace-prestataire/${encodeURIComponent(token)}`);
        const json = (await res.json()) as { purchaseOrder?: Po; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Lien invalide.");
        if (!cancelled) setPo(json.purchaseOrder ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/espace-prestataire/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = (await res.json()) as { purchaseOrder?: Po; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Dépôt impossible.");
      setPo(json.purchaseOrder ?? null);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Lien invalide</h1>
        <p className="mt-2 text-sm text-slate-600">{error || "Ce bon de commande n’est plus accessible."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white px-4 py-12">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Espace prestataire · SD CREATIV
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{po.reference}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {po.vendorName}
          {po.projectName ? ` · ${po.projectName}` : ""}
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Montant</span>
            <span className="font-semibold">{formatMoney(po.amount, po.currency)}</span>
          </div>
          {po.dueDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Échéance</span>
              <span>{po.dueDate}</span>
            </div>
          )}
          {po.description && (
            <p className="border-t border-slate-100 pt-3 text-sm text-slate-700">{po.description}</p>
          )}
        </div>

        {po.deliveredAt ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <PackageCheck className="h-4 w-4" aria-hidden />
              Livrable déposé
            </div>
            <p className="mt-2 whitespace-pre-wrap">{po.deliverableNote}</p>
            <p className="mt-2 text-xs opacity-80">
              {new Date(po.deliveredAt).toLocaleString("fr-FR")}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Déposer le livrable</h2>
            <p className="text-xs text-slate-500">
              Indiquez le lien de livraison, le résumé ou les fichiers transmis (Drive, WeTransfer…).
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ex. Livrables déposés : https://…"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="button"
              disabled={saving || note.trim().length < 4}
              onClick={() => void submit()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirmer la livraison
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
