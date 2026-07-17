"use client";

import { useCallback, useEffect, useState } from "react";
import type { CareerApplication } from "@/lib/career-applications";
import { CAREER_APPLICATION_STATUS_LABELS } from "@/content/priority3-labels";
import type { CareerApplicationStatus } from "@/content/priority3-labels";
import {
  fetchCareerApplications,
  patchCareerApplicationApi,
} from "@/lib/career-applications-api";
import { Loader2 } from "lucide-react";

export function CrmCareerApplicationsPanel() {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setApplications(await fetchCareerApplications());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: CareerApplicationStatus) {
    try {
      await patchCareerApplicationApi(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}
      <p className="text-sm text-gray-text">{applications.length} candidature(s) persistée(s).</p>
      {applications.length === 0 ? (
        <p className="rounded-xl border bg-white px-4 py-8 text-center text-gray-text">Aucune candidature.</p>
      ) : (
        applications.map((app) => (
          <div key={app.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{app.name}</p>
                <p className="text-sm text-gray-text">{app.jobLabel} · {app.email}</p>
                <p className="mt-2 text-sm line-clamp-2">{app.motivation}</p>
              </div>
              <select
                className="rounded-lg border px-2 py-1 text-sm"
                value={app.status}
                onChange={(e) => void updateStatus(app.id, e.target.value as CareerApplicationStatus)}
              >
                {Object.entries(CAREER_APPLICATION_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
