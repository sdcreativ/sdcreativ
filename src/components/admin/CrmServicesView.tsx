"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { PublicServiceRecord, StoredServiceDetail } from "@/lib/public-services-types";
import {
  createServiceApi,
  deleteServiceApi,
  fetchServicesAdmin,
  importStaticServicesApi,
  reorderServiceApi,
  updateServiceApi,
} from "@/lib/public-services-api";
import { LUCIDE_ICON_NAMES } from "@/lib/lucide-icon-map";
import { slugifyServiceTitle } from "@/lib/public-slug-utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Form = {
  slug: string;
  icon: string;
  title: string;
  description: string;
  features: string;
  image: string;
  imageAlt: string;
  detailHref: string;
  detailLabel: string;
  detailJson: string;
  isVisible: boolean;
};

const emptyForm = (): Form => ({
  slug: "",
  icon: "Globe",
  title: "",
  description: "",
  features: "",
  image: "",
  imageAlt: "",
  detailHref: "",
  detailLabel: "",
  detailJson: "",
  isVisible: true,
});

function recordToForm(r: PublicServiceRecord): Form {
  return {
    slug: r.slug,
    icon: r.icon,
    title: r.title,
    description: r.description,
    features: r.features.join("\n"),
    image: r.image ?? "",
    imageAlt: r.imageAlt ?? "",
    detailHref: r.detailHref ?? "",
    detailLabel: r.detailLabel ?? "",
    detailJson: r.detail ? JSON.stringify(r.detail, null, 2) : "",
    isVisible: r.isVisible,
  };
}

function formToPayload(form: Form) {
  let detail: StoredServiceDetail | null = null;
  if (form.detailJson.trim()) {
    detail = JSON.parse(form.detailJson) as StoredServiceDetail;
  }

  return {
    slug: form.slug.trim(),
    icon: form.icon,
    title: form.title.trim(),
    description: form.description.trim(),
    features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
    image: form.image.trim() || undefined,
    imageAlt: form.imageAlt.trim() || undefined,
    detailHref: form.detailHref.trim() || undefined,
    detailLabel: form.detailLabel.trim() || undefined,
    detail,
    isVisible: form.isVisible,
  };
}

export function CrmServicesView() {
  const { confirm } = useDialog();
  const [items, setItems] = useState<PublicServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchServicesAdmin());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm());
    setMessage("");
  }

  function openEdit(item: PublicServiceRecord) {
    setCreating(false);
    setEditingId(item.id);
    setForm(recordToForm(item));
    setMessage("");
  }

  function closeForm() {
    setCreating(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = formToPayload(form);
      if (creating) {
        await createServiceApi(payload);
        setMessage("Service créé.");
      } else if (editingId) {
        await updateServiceApi(editingId, payload);
        setMessage("Service mis à jour.");
      }
      closeForm();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await importStaticServicesApi();
      setMessage(`Import : ${result.imported} ajouté(s), ${result.skipped} ignoré(s).`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="mt-1 text-sm text-gray-text">Grille accueil, hub /services et fiches détaillées.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleImport()} disabled={importing} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Importer statique
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {message && (
        <p className={cn("text-sm", message.includes("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">
          {message}
        </p>
      )}

      {(creating || editingId) && (
        <form onSubmit={(e) => void handleSubmit(e)} className="max-w-3xl space-y-4 rounded-2xl border border-gray/40 bg-white p-6">
          <h2 className="font-semibold text-foreground">{creating ? "Nouveau service" : "Modifier le service"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-gray-text">Slug</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                onBlur={() => {
                  if (creating && !form.slug && form.title) {
                    setForm((f) => ({ ...f, slug: slugifyServiceTitle(f.title) }));
                  }
                }}
                className={fieldClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-text">Icône</span>
              <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={fieldClass}>
                {LUCIDE_ICON_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-gray-text">Titre</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldClass} required />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-gray-text">Description courte</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldClass} rows={2} required />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-gray-text">Points clés (un par ligne)</span>
              <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className={fieldClass} rows={4} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-text">Image URL</span>
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-text">Alt image</span>
              <input value={form.imageAlt} onChange={(e) => setForm({ ...form, imageAlt: e.target.value })} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-text">Lien alternatif (optionnel)</span>
              <input value={form.detailHref} onChange={(e) => setForm({ ...form, detailHref: e.target.value })} className={fieldClass} placeholder="/maintenance" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-gray-text">Label du lien</span>
              <input value={form.detailLabel} onChange={(e) => setForm({ ...form, detailLabel: e.target.value })} className={fieldClass} />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} />
              <span className="text-sm">Visible sur le site</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-gray-text">Fiche détaillée (JSON — laisser vide si pas de page /services/[slug])</span>
              <textarea value={form.detailJson} onChange={(e) => setForm({ ...form, detailJson: e.target.value })} className={cn(fieldClass, "font-mono text-xs")} rows={12} spellCheck={false} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={closeForm} className="rounded-xl border border-gray/60 px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-gray-text"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun service en base. Utilisez « Importer statique » pour préremplir.</p>
      ) : (
        <ul className="divide-y divide-gray/30 rounded-2xl border border-gray/40 bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-gray-text">/{item.slug}{item.detail ? " · fiche détaillée" : ""}</p>
              </div>
              {!item.isVisible && <span className="text-xs text-amber-700">Masqué</span>}
              <div className="flex items-center gap-1">
                <button type="button" disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await reorderServiceApi(item.id, "up"); await load(); } finally { setBusyId(null); } }} className="rounded-lg p-2 hover:bg-gray-light disabled:opacity-50" aria-label="Monter"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await reorderServiceApi(item.id, "down"); await load(); } finally { setBusyId(null); } }} className="rounded-lg p-2 hover:bg-gray-light disabled:opacity-50" aria-label="Descendre"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 hover:bg-gray-light" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
                <button type="button" disabled={busyId === item.id} onClick={async () => {
                  const ok = await confirm({ title: "Supprimer ce service ?", message: item.title, confirmLabel: "Supprimer", variant: "danger" });
                  if (!ok) return;
                  setBusyId(item.id);
                  try { await deleteServiceApi(item.id); await load(); setMessage("Service supprimé."); } finally { setBusyId(null); }
                }} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                <button type="button" disabled={busyId === item.id} onClick={async () => {
                  setBusyId(item.id);
                  try { await updateServiceApi(item.id, { isVisible: !item.isVisible }); await load(); } finally { setBusyId(null); }
                }} className="rounded-lg p-2 hover:bg-gray-light disabled:opacity-50" aria-label={item.isVisible ? "Masquer" : "Afficher"}>
                  {item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
