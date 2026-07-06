"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MILESTONE_STATUS_LABELS,
  type MilestoneStatus,
} from "@/content/projects-labels";
import type { ProjectMilestone } from "@/lib/projects";
import {
  createMilestoneApi,
  deleteMilestoneApi,
  fetchProjectMilestones,
  updateMilestoneApi,
} from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  projectId: string;
  saving?: boolean;
};

export function ProjectMilestonesEditor({ projectId, saving = false }: Props) {
  const { confirm } = useDialog();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMilestones(await fetchProjectMilestones(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAdding(true);
    setError("");
    try {
      await createMilestoneApi(projectId, { label: newLabel.trim() });
      setNewLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ajout impossible.");
    } finally {
      setAdding(false);
    }
  }

  async function handleStatusChange(milestone: ProjectMilestone, status: MilestoneStatus) {
    await updateMilestoneApi(projectId, milestone.id, { status });
    await load();
  }

  async function handleLabelBlur(milestone: ProjectMilestone, label: string) {
    const trimmed = label.trim();
    if (!trimmed || trimmed === milestone.label) return;
    await updateMilestoneApi(projectId, milestone.id, { label: trimmed });
    await load();
  }

  async function handleMove(milestone: ProjectMilestone, direction: "up" | "down") {
    const idx = milestones.findIndex((m) => m.id === milestone.id);
    const swap = direction === "up" ? milestones[idx - 1] : milestones[idx + 1];
    if (!swap) return;
    await Promise.all([
      updateMilestoneApi(projectId, milestone.id, { sortOrder: swap.sortOrder }),
      updateMilestoneApi(projectId, swap.id, { sortOrder: milestone.sortOrder }),
    ]);
    await load();
  }

  async function handleDelete(milestone: ProjectMilestone) {
    const ok = await confirm({
      title: "Supprimer le jalon",
      message: `Supprimer le jalon « ${milestone.label} » ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    await deleteMilestoneApi(projectId, milestone.id);
    await load();
  }

  return (
    <div>
      <h3 className="font-bold text-foreground">Jalons ({milestones.length})</h3>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {milestones.map((milestone, index) => (
            <li
              key={milestone.id}
              className="flex gap-2 rounded-xl border border-gray/25 bg-gray-light/30 p-3"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  milestone.status === "done" && "bg-emerald-100 text-emerald-700",
                  milestone.status === "current" && "bg-primary text-white",
                  milestone.status === "upcoming" && "bg-white text-gray-text",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="text"
                  defaultValue={milestone.label}
                  disabled={saving}
                  onBlur={(e) => void handleLabelBlur(milestone, e.target.value)}
                  className={fieldClass}
                  aria-label={`Libellé jalon ${index + 1}`}
                />
                <select
                  value={milestone.status}
                  disabled={saving}
                  onChange={(e) =>
                    void handleStatusChange(milestone, e.target.value as MilestoneStatus)
                  }
                  className="rounded-lg border border-gray/50 px-2 py-1 text-xs"
                  aria-label={`Statut du jalon ${milestone.label}`}
                >
                  {Object.entries(MILESTONE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  disabled={saving || index === 0}
                  onClick={() => void handleMove(milestone, "up")}
                  className="rounded p-1 text-gray-text hover:bg-white disabled:opacity-30"
                  aria-label="Monter"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={saving || index === milestones.length - 1}
                  onClick={() => void handleMove(milestone, "down")}
                  className="rounded p-1 text-gray-text hover:bg-white disabled:opacity-30"
                  aria-label="Descendre"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete(milestone)}
                  className="rounded p-1 text-accent hover:bg-accent/10"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nouveau jalon…"
          className={fieldClass}
          disabled={adding || saving}
        />
        <button
          type="submit"
          disabled={adding || saving || !newLabel.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Ajouter
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </div>
  );
}
