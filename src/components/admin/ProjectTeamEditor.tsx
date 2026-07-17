"use client";

import { useCallback, useEffect, useState } from "react";
import { useCrmAssigneeOptions } from "@/hooks/useCrmTeamMembers";
import type { Project } from "@/lib/projects";
import {
  fetchProjectById,
  fetchProjectTeamApi,
  setProjectTeamApi,
} from "@/lib/projects-api";
import type { ProjectTeamMember } from "@/lib/project-team";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Props = {
  project: Project;
  saving?: boolean;
  onUpdated: (project: Project) => void;
};

export function ProjectTeamEditor({ project, saving = false, onUpdated }: Props) {
  const assignees = useCrmAssigneeOptions();
  const [members, setMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMembers(await fetchProjectTeamApi(project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'équipe.");
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleMember(userId: string) {
    const selected = new Set(members.map((m) => m.userId));
    if (selected.has(userId)) selected.delete(userId);
    else selected.add(userId);
    setBusy(true);
    setError("");
    try {
      setMembers(await setProjectTeamApi(project.id, [...selected]));
      const refreshed = await fetchProjectById(project.id);
      onUpdated(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  const memberIds = new Set(members.map((m) => m.userId));
  const leadId = project.assigneeId ?? null;

  return (
    <div>
      <h3 className="font-bold text-foreground">Membres de l&apos;équipe</h3>
      <p className="mt-1 text-xs text-gray-text">
        En plus du chef de projet — sélectionnez les collaborateurs (comptes CRM).
      </p>
      {error && (
        <p className="mt-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
          {error}
        </p>
      )}
      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-text">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Chargement…
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {assignees.map((user) => {
            const active = memberIds.has(user.id);
            const isLead = leadId === user.id || (!leadId && project.assignee === user.name);
            return (
              <button
                key={user.id}
                type="button"
                disabled={saving || busy || isLead}
                onClick={() => void toggleMember(user.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  isLead && "cursor-default bg-primary text-white opacity-80",
                  !isLead && active && "bg-primary-light text-primary ring-1 ring-primary/30",
                  !isLead && !active && "bg-gray-light text-gray-text hover:bg-gray-light/80",
                )}
                title={isLead ? "Chef de projet (assigné principal)" : undefined}
              >
                {user.name}
                {isLead && " · chef"}
              </button>
            );
          })}
          {assignees.length === 0 && (
            <p className="text-xs text-gray-text">Aucun compte CRM actif.</p>
          )}
        </div>
      )}
    </div>
  );
}
