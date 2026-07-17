"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/currencies";
import type { Vendor, VendorPurchaseOrder } from "@/lib/vendors";
import {
  createPurchaseOrderApi,
  createVendorApi,
  deleteVendorApi,
  fetchProjectVendorMargin,
  fetchPurchaseOrders,
  fetchVendors,
  updatePurchaseOrderStatusApi,
  updateVendorApi,
} from "@/lib/vendors-api";
import { fetchProjects } from "@/lib/projects-api";
import type { Project } from "@/lib/projects";
import { PO_STATUSES, PO_STATUS_LABELS, type PurchaseOrderStatus } from "@/content/priority3-labels";
import { useDialog } from "@/components/ui/DialogProvider";
import { Loader2, Pencil, Plus, Trash2, UserCog } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmVendorsView() {
  const { confirm } = useDialog();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<VendorPurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showVendor, setShowVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [showPo, setShowPo] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [margin, setMargin] = useState<{
    budget: number | null;
    vendorCosts: number;
    margin: number | null;
  } | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    hourlyRate: "",
  });
  const [poForm, setPoForm] = useState({
    vendorId: "",
    projectId: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [v, o, p] = await Promise.all([
        fetchVendors(),
        fetchPurchaseOrders(projectFilter || undefined),
        fetchProjects(),
      ]);
      setVendors(v);
      setOrders(o);
      setProjects(p);
      if (projectFilter) {
        setMargin(await fetchProjectVendorMargin(projectFilter));
      } else {
        setMargin(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les prestataires.");
      setVendors([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateVendor() {
    setEditingVendorId(null);
    setVendorForm({ name: "", email: "", phone: "", specialty: "", hourlyRate: "" });
    setShowVendor(true);
  }

  function openEditVendor(v: Vendor) {
    setEditingVendorId(v.id);
    setVendorForm({
      name: v.name,
      email: v.email ?? "",
      phone: v.phone ?? "",
      specialty: v.specialty ?? "",
      hourlyRate: v.hourlyRate != null ? String(v.hourlyRate) : "",
    });
    setShowVendor(true);
  }

  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: vendorForm.name,
      email: vendorForm.email || null,
      phone: vendorForm.phone || null,
      specialty: vendorForm.specialty || null,
      hourlyRate: vendorForm.hourlyRate ? Number(vendorForm.hourlyRate) : null,
    };
    try {
      if (editingVendorId) {
        await updateVendorApi(editingVendorId, payload);
      } else {
        await createVendorApi(payload);
      }
      setShowVendor(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVendor(v: Vendor) {
    const ok = await confirm({
      title: "Supprimer ce prestataire ?",
      message: `${v.name} et ses liaisons seront affectés.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteVendorApi(v.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function handleCreatePo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createPurchaseOrderApi({
        vendorId: poForm.vendorId,
        projectId: poForm.projectId || null,
        amount: Number(poForm.amount),
        description: poForm.description || null,
        dueDate: poForm.dueDate || null,
      });
      setShowPo(false);
      setPoForm({ vendorId: "", projectId: "", amount: "", description: "", dueDate: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création du BC impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: PurchaseOrderStatus) {
    setError("");
    try {
      await updatePurchaseOrderStatusApi(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour du statut impossible.");
    }
  }

  if (loading && vendors.length === 0) {
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
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <UserCog className="h-5 w-5 text-primary" aria-hidden />
            Prestataires & sous-traitance
          </h2>
          <p className="text-sm text-gray-text">Freelances, bons de commande et marge par projet.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPo(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/40 px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Bon de commande
          </button>
          <button
            type="button"
            onClick={openCreateVendor}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau prestataire
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-xl border border-gray/50 bg-white px-3 py-2 text-sm"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">Tous les projets</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {margin && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
            <span className="font-semibold text-emerald-800">Marge projet : </span>
            <span className="text-emerald-700">
              budget {margin.budget != null ? formatMoney(margin.budget, "XOF") : "—"} · coûts{" "}
              {formatMoney(margin.vendorCosts, "XOF")} · marge{" "}
              {margin.margin != null ? formatMoney(margin.margin, "XOF") : "—"}
            </span>
          </div>
        )}
      </div>

      {showVendor && (
        <form onSubmit={handleSaveVendor} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold">
            {editingVendorId ? "Modifier le prestataire" : "Nouveau prestataire"}
          </h3>
          <input
            className={fieldClass}
            placeholder="Nom"
            value={vendorForm.name}
            onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClass}
              placeholder="Email"
              type="email"
              value={vendorForm.email}
              onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="Téléphone"
              value={vendorForm.phone}
              onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="Spécialité"
              value={vendorForm.specialty}
              onChange={(e) => setVendorForm((f) => ({ ...f, specialty: e.target.value }))}
            />
            <input
              className={fieldClass}
              placeholder="Taux horaire"
              type="number"
              min="0"
              value={vendorForm.hourlyRate}
              onChange={(e) => setVendorForm((f) => ({ ...f, hourlyRate: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? "…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setShowVendor(false)}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {showPo && (
        <form onSubmit={handleCreatePo} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Nouveau bon de commande</h3>
          <select
            className={fieldClass}
            value={poForm.vendorId}
            onChange={(e) => setPoForm((f) => ({ ...f, vendorId: e.target.value }))}
            required
          >
            <option value="">Prestataire…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={poForm.projectId}
            onChange={(e) => setPoForm((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">Projet (optionnel)…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className={fieldClass}
            type="number"
            min="1"
            placeholder="Montant"
            value={poForm.amount}
            onChange={(e) => setPoForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <input
            className={fieldClass}
            type="date"
            value={poForm.dueDate}
            onChange={(e) => setPoForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
          <input
            className={fieldClass}
            placeholder="Description"
            value={poForm.description}
            onChange={(e) => setPoForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowPo(false)}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Prestataires ({vendors.length})</h3>
          {vendors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray/40 px-4 py-10 text-center text-sm text-gray-text">
              Aucun prestataire. Ajoutez un freelance ou sous-traitant.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {vendors.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-gray/20 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-gray-text">
                      {v.specialty ?? "—"} · {v.email ?? "—"}
                      {v.hourlyRate != null && ` · ${formatMoney(v.hourlyRate, v.currency)}/h`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditVendor(v)}
                      className="rounded-lg p-1.5 text-primary hover:bg-white"
                      aria-label="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteVendor(v)}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-white"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Bons de commande ({orders.length})</h3>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray/40 px-4 py-10 text-center text-sm text-gray-text">
              Aucun bon de commande. Liez un montant à un projet pour suivre la marge.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {orders.map((o) => (
                <li key={o.id} className="rounded-lg bg-gray/20 px-3 py-2">
                  <p className="font-medium">
                    {o.reference} — {o.vendorName}
                  </p>
                  <p className="text-xs text-gray-text">
                    {formatMoney(o.amount, o.currency)}
                    {o.projectName && ` · ${o.projectName}`}
                  </p>
                  <select
                    className="mt-2 rounded-lg border border-gray/40 bg-white px-2 py-1 text-xs"
                    value={o.status}
                    onChange={(e) =>
                      void handleStatusChange(o.id, e.target.value as PurchaseOrderStatus)
                    }
                  >
                    {PO_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PO_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
