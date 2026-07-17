"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProjects } from "@/lib/projects-api";
import type { Project } from "@/lib/projects";
import type { ProjectTimeSummary, TimeEntry } from "@/lib/time-entries";
import {
  createTimeEntryApi,
  deleteTimeEntryApi,
  fetchTimeEntries,
  fetchTimeSummaries,
  updateTimeEntryApi,
} from "@/lib/operations-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import { Clock, Loader2, Pencil, Plus, TrendingUp } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type FormState = {
  projectId: string;
  hours: string;
  description: string;
  soldHours: string;
  entryDate: string;
  billable: boolean;
};

const emptyForm = (): FormState => ({
  projectId: "",
  hours: "1",
  description: "",
  soldHours: "",
  entryDate: new Date().toISOString().slice(0, 10),
  billable: true,
});

export function CrmTimesheetsView() {
  const { confirm } = useDialog();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summaries, setSummaries] = useState<ProjectTimeSummary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [projectFilter, setProjectFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [entriesData, summariesData, projectsData] = await Promise.all([
        fetchTimeEntries(projectFilter ? { projectId: projectFilter } : undefined),
        fetchTimeSummaries(),
        fetchProjects(),
      ]);
      setEntries(entriesData);
      setSummaries(summariesData);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le suivi du temps.");
      setEntries([]);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setForm({
      projectId: entry.projectId,
      hours: String(entry.hours),
      description: entry.description ?? "",
      soldHours: entry.soldHours != null ? String(entry.soldHours) : "",
      entryDate: entry.entryDate,
      billable: entry.billable,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      projectId: form.projectId,
      hours: Number(form.hours),
      description: form.description || null,
      soldHours: form.soldHours ? Number(form.soldHours) : null,
      entryDate: form.entryDate,
      billable: form.billable,
    };
    try {
      if (editingId) {
        const { projectId: _p, ...update } = payload;
        void _p;
        await updateTimeEntryApi(editingId, update);
      } else {
        await createTimeEntryApi(payload);
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: TimeEntry) {
    const ok = await confirm({
      title: "Supprimer cette saisie ?",
      message: `${entry.hours}h sur ${entry.projectName} (${entry.entryDate}) seront supprimées.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setError("");
    try {
      await deleteTimeEntryApi(entry.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  if (loading && entries.length === 0 && summaries.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-primary" aria-hidden />
            Suivi du temps
          </h2>
          <p className="text-sm text-gray-text">
            Heures par projet vs heures vendues — rentabilité.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Saisir des heures
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
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
      </div>

      {summaries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <div key={s.projectId} className="rounded-2xl border border-gray/30 bg-white p-4 shadow-sm">
              <p className="truncate font-semibold">{s.projectName}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-lg font-bold text-primary">{s.loggedHours}h</p>
                  <p className="text-gray-text">Saisies</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{s.soldHours}h</p>
                  <p className="text-gray-text">Vendues</p>
                </div>
                <div>
                  <p
                    className={cn(
                      "flex items-center justify-center gap-0.5 text-lg font-bold",
                      s.profitability != null && s.profitability < 100
                        ? "text-amber-600"
                        : "text-green-600",
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    {s.profitability != null ? `${s.profitability}%` : "—"}
                  </p>
                  <p className="text-gray-text">Ratio</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray/40 bg-gray-light/20 px-4 py-8 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-gray-text/40" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Aucune rentabilité calculée</p>
          <p className="mt-1 text-xs text-gray-text">
            Saisissez des heures pour voir le ratio heures saisies / vendues par projet.
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray/30 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-foreground">
            {editingId ? "Modifier la saisie" : "Nouvelle saisie"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Projet</span>
              <select
                className={fieldClass}
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                required
                disabled={Boolean(editingId)}
              >
                <option value="">Sélectionner…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Heures</span>
              <input
                type="number"
                step="0.25"
                min="0.25"
                className={fieldClass}
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Heures vendues (devis)</span>
              <input
                type="number"
                step="0.5"
                className={fieldClass}
                value={form.soldHours}
                onChange={(e) => setForm((f) => ({ ...f, soldHours: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Date</span>
              <input
                type="date"
                className={fieldClass}
                value={form.entryDate}
                onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input
                type="checkbox"
                checked={form.billable}
                onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))}
              />
              Facturable
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <input
                className={fieldClass}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-xl border border-gray/40 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/40 bg-white px-6 py-14 text-center shadow-sm">
          <Clock className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-semibold text-foreground">Aucune saisie de temps</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-text">
            Enregistrez les heures passées sur vos projets pour suivre la rentabilité.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            Première saisie
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray/30 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray/30 text-left text-xs uppercase text-gray-text">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Heures</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{entry.entryDate}</td>
                  <td className="px-4 py-3">{entry.projectName}</td>
                  <td className="px-4 py-3 font-medium">
                    {entry.hours}h
                    {!entry.billable && (
                      <span className="ml-1 text-xs text-gray-text">(NF)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-text">{entry.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
