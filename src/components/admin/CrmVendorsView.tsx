"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/currencies";
import type { Vendor, VendorPurchaseOrder } from "@/lib/vendors";
import { PO_STATUS_LABELS } from "@/content/priority3-labels";
import { Loader2, Plus } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmVendorsView() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<VendorPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendor, setShowVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", email: "", specialty: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, oRes] = await Promise.all([
        fetch("/api/admin/vendors", { credentials: "include" }),
        fetch("/api/admin/vendors?view=purchase_orders", { credentials: "include" }),
      ]);
      const vJson = (await vRes.json()) as { vendors: Vendor[] };
      const oJson = (await oRes.json()) as { purchaseOrders: VendorPurchaseOrder[] };
      setVendors(vJson.vendors ?? []);
      setOrders(oJson.purchaseOrders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/vendors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendorForm),
    });
    setShowVendor(false);
    void load();
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
          <h2 className="text-lg font-bold">Prestataires & sous-traitance</h2>
          <p className="text-sm text-gray-text">Freelances, bons de commande et coûts par projet.</p>
        </div>
        <button type="button" onClick={() => setShowVendor(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden />
          Nouveau prestataire
        </button>
      </div>

      {showVendor && (
        <form onSubmit={handleCreateVendor} className="rounded-2xl border bg-white p-5 space-y-3">
          <input className={fieldClass} placeholder="Nom" value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} required />
          <input className={fieldClass} placeholder="Email" type="email" value={vendorForm.email} onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))} />
          <input className={fieldClass} placeholder="Spécialité" value={vendorForm.specialty} onChange={(e) => setVendorForm((f) => ({ ...f, specialty: e.target.value }))} />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm text-white">Créer</button>
            <button type="button" onClick={() => setShowVendor(false)} className="rounded-xl border px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-3">Prestataires ({vendors.length})</h3>
          <ul className="space-y-2 text-sm">
            {vendors.map((v) => (
              <li key={v.id} className="rounded-lg bg-gray/20 px-3 py-2">
                <p className="font-medium">{v.name}</p>
                <p className="text-xs text-gray-text">{v.specialty ?? "—"} · {v.email ?? "—"}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold mb-3">Bons de commande</h3>
          <ul className="space-y-2 text-sm">
            {orders.map((o) => (
              <li key={o.id} className="rounded-lg bg-gray/20 px-3 py-2">
                <p className="font-medium">{o.reference} — {o.vendorName}</p>
                <p className="text-xs text-gray-text">
                  {formatMoney(o.amount, o.currency)} · {PO_STATUS_LABELS[o.status]}
                  {o.projectName && ` · ${o.projectName}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
