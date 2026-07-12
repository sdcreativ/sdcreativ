"use client";

import { useCallback, useEffect, useState } from "react";
import {
  REPORT_FREQUENCY_LABELS,
  REPORT_KPI_LABELS,
  REPORT_KPI_KEYS,
  type ScheduledReportConfig,
} from "@/lib/operations-settings-types";
import { fetchOperationsSettings, saveOperationsSettings } from "@/lib/operations-api";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function emptyReport(): ScheduledReportConfig {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    label: "Rapport mensuel",
    recipients: [],
    frequency: "monthly",
    kpis: ["newLeads", "revenueQuotes", "quotesAccepted", "pipelineValue"],
    includeComparison: true,
    includeCsv: true,
    lastSentAt: null,
  };
}

export function CrmOperationsSettingsSection() {
  const [reports, setReports] = useState<ScheduledReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ops = await fetchOperationsSettings();
      setReports(ops.scheduledReports);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await saveOperationsSettings({ scheduledReports: reports });
      setMessage("Configuration enregistrée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  function updateReport(id: string, patch: Partial<ScheduledReportConfig>) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
      <p className="text-sm text-gray-text">
        Rapports planifiés envoyés par le cron <code className="text-xs">/api/cron/scheduled-reports</code>.
      </p>

      {reports.map((report) => (
        <div key={report.id} className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={report.enabled}
                onChange={(e) => updateReport(report.id, { enabled: e.target.checked })}
              />
              Actif
            </label>
            <button
              type="button"
              onClick={() => setReports((prev) => prev.filter((r) => r.id !== report.id))}
              className="text-gray-text hover:text-red-600"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <input
            className={fieldClass}
            value={report.label}
            onChange={(e) => updateReport(report.id, { label: e.target.value })}
            placeholder="Libellé"
          />
          <input
            className={fieldClass}
            value={report.recipients.join(", ")}
            onChange={(e) =>
              updateReport(report.id, {
                recipients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="Destinataires (emails séparés par des virgules)"
          />
          <select
            className={fieldClass}
            value={report.frequency}
            onChange={(e) => updateReport(report.id, { frequency: e.target.value as ScheduledReportConfig["frequency"] })}
          >
            {Object.entries(REPORT_FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {REPORT_KPI_KEYS.map((kpi) => (
              <label key={kpi} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={report.kpis.includes(kpi)}
                  onChange={(e) => {
                    const kpis = e.target.checked
                      ? [...report.kpis, kpi]
                      : report.kpis.filter((k) => k !== kpi);
                    updateReport(report.id, { kpis });
                  }}
                />
                {REPORT_KPI_LABELS[kpi]}
              </label>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={report.includeComparison}
                onChange={(e) => updateReport(report.id, { includeComparison: e.target.checked })}
              />
              Comparaison N-1
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={report.includeCsv}
                onChange={(e) => updateReport(report.id, { includeCsv: e.target.checked })}
              />
              Inclure CSV
            </label>
          </div>
          {report.lastSentAt && (
            <p className="text-xs text-gray-text">
              Dernier envoi : {new Date(report.lastSentAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setReports((prev) => [...prev, emptyReport()])}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter un rapport
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          <Save className="h-4 w-4" aria-hidden />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {message && <p className="text-sm text-gray-text">{message}</p>}
    </div>
  );
}
