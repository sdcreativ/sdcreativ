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
} from "@/lib/operations-api";
import { cn } from "@/lib/utils";
import { Clock, Loader2, Plus, TrendingUp } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmTimesheetsView() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summaries, setSummaries] = useState<ProjectTimeSummary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    hours: "1",
    description: "",
    soldHours: "",
    entryDate: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, summariesData, projectsData] = await Promise.all([
        fetchTimeEntries(),
        fetchTimeSummaries(),
        fetchProjects(),
      ]);
      setEntries(entriesData);
      setSummaries(summariesData);
      setProjects(projectsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const created = await createTimeEntryApi({
      projectId: form.projectId,
      hours: Number(form.hours),
      description: form.description || null,
      soldHours: form.soldHours ? Number(form.soldHours) : null,
      entryDate: form.entryDate,
    });
    setEntries((prev) => [created, ...prev]);
    setSummaries(await fetchTimeSummaries());
    setShowCreate(false);
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
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden />
            Suivi du temps
          </h2>
          <p className="text-sm text-gray-text">
            Heures par projet vs heures vendues — rentabilité.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden />
          Saisir des heures
        </button>
      </div>

      {summaries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <div key={s.projectId} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="font-semibold truncate">{s.projectName}</p>
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
                  <p className={cn("text-lg font-bold flex items-center justify-center gap-0.5", s.profitability != null && s.profitability < 100 ? "text-amber-600" : "text-green-600")}>
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    {s.profitability != null ? `${s.profitability}%` : "—"}
                  </p>
                  <p className="text-gray-text">Ratio</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Projet</span>
              <select className={fieldClass} value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} required>
                <option value="">Sélectionner…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Heures</span>
              <input type="number" step="0.25" min="0.25" className={fieldClass} value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Heures vendues (devis)</span>
              <input type="number" step="0.5" className={fieldClass} value={form.soldHours} onChange={(e) => setForm((f) => ({ ...f, soldHours: e.target.value }))} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Date</span>
              <input type="date" className={fieldClass} value={form.entryDate} onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <input className={fieldClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Enregistrer</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
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
                <td className="px-4 py-3 font-medium">{entry.hours}h</td>
                <td className="px-4 py-3 text-gray-text">{entry.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => void deleteTimeEntryApi(entry.id).then(load)} className="text-xs text-red-600 hover:underline">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
