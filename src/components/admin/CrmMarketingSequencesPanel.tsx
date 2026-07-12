"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketingSequence } from "@/lib/marketing-sequences";
import { Loader2 } from "lucide-react";

export function CrmMarketingSequencesPanel() {
  const [sequences, setSequences] = useState<MarketingSequence[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-sequences", { credentials: "include" });
      const json = (await res.json()) as { sequences: MarketingSequence[] };
      setSequences(json.sequences ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch("/api/admin/marketing-sequences", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
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
      <p className="text-sm text-gray-text">
        Séquences automatiques sur les leads (audit → J+3 → J+7). Cron :{" "}
        <code className="text-xs">/api/cron/marketing-sequences</code>
      </p>
      {sequences.map((seq) => (
        <div key={seq.id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{seq.name}</h3>
              <p className="text-xs text-gray-text">
                Déclencheur : statut « {seq.triggerStatus} » · {seq.steps.length} étape(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => void toggleActive(seq.id, seq.isActive)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                seq.isActive ? "bg-green-100 text-green-700" : "bg-gray/30 text-gray-text"
              }`}
            >
              {seq.isActive ? "Actif" : "Inactif"}
            </button>
          </div>
          <ol className="mt-3 space-y-2 text-sm">
            {seq.steps.map((step, i) => (
              <li key={step.id} className="rounded-lg bg-gray/20 px-3 py-2">
                <span className="font-medium">J+{step.delayDays}</span> — {step.subject}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
