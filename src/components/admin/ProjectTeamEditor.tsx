"use client";

import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import type { Project } from "@/lib/projects";
import { updateProjectApi } from "@/lib/projects-api";
import { buildTeamMetadataUpdate, getProjectTeamMembers } from "@/lib/project-team";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  saving?: boolean;
  onUpdated: (project: Project) => void;
};

export function ProjectTeamEditor({ project, saving = false, onUpdated }: Props) {
  const assignees = useCrmAssignees();
  const members = getProjectTeamMembers(project);

  async function toggleMember(name: string) {
    const next = members.includes(name)
      ? members.filter((m) => m !== name)
      : [...members, name];
    const updated = await updateProjectApi(project.id, {
      metadata: buildTeamMetadataUpdate(project, next),
    });
    onUpdated(updated);
  }

  return (
    <div>
      <h3 className="font-bold text-foreground">Membres de l&apos;équipe</h3>
      <p className="mt-1 text-xs text-gray-text">
        En plus du chef de projet — sélectionnez les collaborateurs impliqués.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {assignees.map((name) => {
          const active = members.includes(name);
          const isLead = project.assignee === name;
          return (
            <button
              key={name}
              type="button"
              disabled={saving || isLead}
              onClick={() => void toggleMember(name)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                isLead && "bg-primary text-white opacity-80 cursor-default",
                !isLead && active && "bg-primary-light text-primary ring-1 ring-primary/30",
                !isLead && !active && "bg-gray-light text-gray-text hover:bg-gray-light/80",
              )}
              title={isLead ? "Chef de projet (assigné principal)" : undefined}
            >
              {name}
              {isLead && " · chef"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
