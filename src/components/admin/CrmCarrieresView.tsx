"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { PublicJobOfferRecord } from "@/lib/public-job-offers-types";
import {
  createJobOfferApi,
  deleteJobOfferApi,
  fetchCareersSettingsAdmin,
  fetchJobOffersAdmin,
  importStaticJobOffersApi,
  reorderJobOfferApi,
  saveCareersSettingsAdmin,
  updateJobOfferApi,
} from "@/lib/public-job-offers-api";
import { slugifyJobTitle } from "@/lib/public-slug-utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type JobForm = {
  slug: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string;
  profile: string;
  isVisible: boolean;
};

const emptyJobForm = (): JobForm => ({
  slug: "",
  title: "",
  type: "CDI",
  location: "",
  department: "Commercial",
  description: "",
  missions: "",
  profile: "",
  isVisible: true,
});

function recordToJobForm(r: PublicJobOfferRecord): JobForm {
  return {
    slug: r.slug,
    title: r.title,
    type: r.type,
    location: r.location,
    department: r.department,
    description: r.description,
    missions: r.missions.join("\n"),
    profile: r.profile.join("\n"),
    isVisible: r.isVisible,
  };
}

export function CrmCarrieresView() {
  const { confirm } = useDialog();
  const [items, setItems] = useState<PublicJobOfferRecord[]>([]);
  const [benefits, setBenefits] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<JobForm>(emptyJobForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobs, careers] = await Promise.all([
        fetchJobOffersAdmin(),
        fetchCareersSettingsAdmin(),
      ]);
      setItems(jobs);
      setBenefits(careers.benefits.join("\n"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveCareersSettingsAdmin({
        benefits: benefits.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      if (creating || editingId) {
        const payload = {
          slug: form.slug.trim(),
          title: form.title.trim(),
          type: form.type.trim(),
          location: form.location.trim(),
          department: form.department.trim(),
          description: form.description.trim(),
          missions: form.missions.split("\n").map((s) => s.trim()).filter(Boolean),
          profile: form.profile.split("\n").map((s) => s.trim()).filter(Boolean),
          isVisible: form.isVisible,
        };
        if (creating) await createJobOfferApi(payload);
        else if (editingId) await updateJobOfferApi(editingId, payload);
        setCreating(false);
        setEditingId(null);
        setForm(emptyJobForm());
      }
      await load();
      setMessage("Carrières enregistrées.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await importStaticJobOffersApi();
      setMessage(`Import : ${result.imported} offre(s), ${result.skipped} ignorée(s).`);
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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Briefcase className="h-6 w-6 text-primary" aria-hidden />
            Carrières
          </h1>
          <p className="mt-1 text-sm text-gray-text">Offres d&apos;emploi et avantages affichés sur /carrieres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleImport()} disabled={importing} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Importer statique
          </button>
          <button type="button" onClick={() => { setCreating(true); setEditingId(null); setForm(emptyJobForm()); }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Ajouter une offre
          </button>
        </div>
      </div>

      {message && (
        <p className={cn("text-sm", message.includes("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">
          {message}
        </p>
      )}

      <form onSubmit={(e) => void handleSaveAll(e)} className="max-w-3xl space-y-8">
        <fieldset className="space-y-3 rounded-2xl border border-gray/40 p-6">
          <legend className="px-2 font-semibold">Avantages (un par ligne)</legend>
          <textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} className={fieldClass} rows={5} title="Avantages" />
        </fieldset>

        {(creating || editingId) && (
          <fieldset className="space-y-3 rounded-2xl border border-primary/30 p-6">
            <legend className="px-2 font-semibold">{creating ? "Nouvelle offre" : "Modifier l'offre"}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldClass} placeholder="Titre" required />
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} onBlur={() => { if (creating && !form.slug && form.title) setForm((f) => ({ ...f, slug: slugifyJobTitle(f.title) })); }} className={fieldClass} placeholder="Slug" required />
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={fieldClass} placeholder="Type (CDI, Freelance…)" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={fieldClass} placeholder="Lieu" />
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={fieldClass} placeholder="Département" />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} />
                Visible
              </label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cn(fieldClass, "sm:col-span-2")} rows={2} placeholder="Description" />
              <textarea value={form.missions} onChange={(e) => setForm({ ...form, missions: e.target.value })} className={fieldClass} rows={4} placeholder="Missions (une par ligne)" />
              <textarea value={form.profile} onChange={(e) => setForm({ ...form, profile: e.target.value })} className={fieldClass} rows={4} placeholder="Profil recherché (une par ligne)" />
            </div>
          </fieldset>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray/30 rounded-2xl border border-gray/40 bg-white">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-gray-text">{item.location} · {item.type}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button title="Monter" type="button" disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await reorderJobOfferApi(item.id, "up"); await load(); } finally { setBusyId(null); } }} className="rounded-lg p-2 hover:bg-gray-light"><ArrowUp className="h-4 w-4" /></button>
                  <button title="Descendre" type="button" disabled={busyId === item.id} onClick={async () => { setBusyId(item.id); try { await reorderJobOfferApi(item.id, "down"); await load(); } finally { setBusyId(null); } }} className="rounded-lg p-2 hover:bg-gray-light"><ArrowDown className="h-4 w-4" /></button>
                  <button title="Modifier" type="button" onClick={() => { setCreating(false); setEditingId(item.id); setForm(recordToJobForm(item)); }} className="rounded-lg p-2 hover:bg-gray-light"><Pencil className="h-4 w-4" /></button>
                  <button title="Supprimer" type="button" disabled={busyId === item.id} onClick={async () => {
                    const ok = await confirm({ title: "Supprimer ?", message: item.title, confirmLabel: "Supprimer", variant: "danger" });
                    if (!ok) return;
                    setBusyId(item.id);
                    try { await deleteJobOfferApi(item.id); await load(); } finally { setBusyId(null); }
                  }} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  <button type="button" disabled={busyId === item.id} onClick={async () => {
                    setBusyId(item.id);
                    try { await updateJobOfferApi(item.id, { isVisible: !item.isVisible }); await load(); } finally { setBusyId(null); }
                  }} className="rounded-lg p-2 hover:bg-gray-light">
                    {item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
