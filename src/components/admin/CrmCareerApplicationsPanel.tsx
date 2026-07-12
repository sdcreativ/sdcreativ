"use client";

import { useCallback, useEffect, useState } from "react";
import type { CareerApplication } from "@/lib/career-applications";
import { CAREER_APPLICATION_STATUS_LABELS } from "@/content/priority3-labels";
import type { CareerApplicationStatus } from "@/content/priority3-labels";
import { Loader2 } from "lucide-react";

export function CrmCareerApplicationsPanel() {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/career-applications", { credentials: "include" });
      const json = (await res.json()) as { applications: CareerApplication[] };
      setApplications(json.applications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: CareerApplicationStatus) {
    await fetch("/api/admin/career-applications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
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
