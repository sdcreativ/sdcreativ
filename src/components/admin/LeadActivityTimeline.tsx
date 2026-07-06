"use client";

import { useCallback, useEffect, useState } from "react";
import { formatLeadDate } from "@/content/leads-labels";
import { addLeadActivityApi, fetchLeadActivities, type LeadActivity } from "@/lib/leads-api";
import type { LeadActivityType } from "@/lib/lead-activities";
import { Loader2, MessageSquare } from "lucide-react";

const ACTIVITY_TYPE_LABELS: Record<LeadActivityType, string> = {
  created: "Création",
  note: "Note",
  status_change: "Changement de statut",
  assignee_change: "Assignation",
  email_sent: "Email envoyé",
};

type Props = {
  leadId: string;
  refreshKey?: number;
};

export function LeadActivityTimeline({ leadId, refreshKey = 0 }: Props) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLeadActivities(leadId);
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities, refreshKey]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addLeadActivityApi(leadId, { content: note.trim() });
      setNote("");
      await loadActivities();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 font-bold text-foreground">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
        Activité
      </h3>
      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-3 text-gray-text">Aucune activité enregistrée.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {activities.map((item) => (
            <li key={item.id} className="rounded-xl border border-gray/30 bg-gray-light/50 p-3">
              <div className="flex items-center justify-between gap-2 text-[11px] text-gray-text">
                <span className="font-semibold text-primary">
                  {ACTIVITY_TYPE_LABELS[item.type]}
                  {item.actorName ? ` · ${item.actorName}` : ""}
                </span>
                <span>{formatLeadDate(item.createdAt)}</span>
              </div>
              {item.subject && <p className="mt-1 font-medium text-foreground">{item.subject}</p>}
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.content}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAddNote} className="mt-4 space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
          Ajouter une note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={saving}
            placeholder="Appel, relance, contexte…"
            className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !note.trim()}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer la note"}
        </button>
      </form>
    </div>
  );
}
