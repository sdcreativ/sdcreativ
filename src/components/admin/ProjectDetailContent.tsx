"use client";

import Link from "next/link";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  formatProjectBudget,
  formatProjectDate,
  type ProjectStatus,
} from "@/content/projects-labels";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { ProjectArchivePanel } from "@/components/admin/ProjectArchivePanel";
import { ProjectDocumentsPanel } from "@/components/admin/ProjectDocumentsPanel";
import { ProjectCalendarLink, ProjectGanttTimeline } from "@/components/admin/ProjectGanttTimeline";
import { ProjectMilestonesEditor } from "@/components/admin/ProjectMilestonesEditor";
import { ProjectPaymentScheduleEditor } from "@/components/admin/ProjectPaymentScheduleEditor";
import { ProjectTeamEditor } from "@/components/admin/ProjectTeamEditor";
import type { Project } from "@/lib/projects";
import { updateProjectApi } from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

const statusStyles: Record<ProjectStatus, string> = {
  discovery: "bg-sky-100 text-sky-700",
  design: "bg-violet-100 text-violet-700",
  development: "bg-primary-light text-primary",
  testing: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-gray-light text-gray-text",
  cancelled: "bg-red-100 text-red-700",
};

type Props = {
  project: Project;
  saving?: boolean;
  onUpdated: (project: Project) => void;
  showPageLink?: boolean;
};

export function ProjectDetailContent({
  project,
  saving = false,
  onUpdated,
  showPageLink = false,
}: Props) {
  const assignees = useCrmAssignees();

  async function patch(input: Record<string, unknown>) {
    const updated = await updateProjectApi(project.id, input);
    onUpdated(updated);
  }

  return (
    <div className="space-y-5 text-sm">
      {showPageLink && (
        <Link
          href={`/admin/crm/projets/${project.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          Ouvrir la page détail
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold",
            statusStyles[project.status],
          )}
        >
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
        <span className="text-xs text-gray-text">
          {project.clientCompany || project.clientName}
        </span>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
        <select
          value={project.status}
          disabled={saving}
          onChange={(e) => void patch({ status: e.target.value })}
          className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
        >
          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Chef de projet / assigné
        </span>
        <select
          value={project.assignee ?? ""}
          disabled={saving}
          onChange={(e) => void patch({ assignee: e.target.value || null })}
          className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
        >
          <option value="">Non assigné</option>
          {assignees.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>
      </label>

      <ProjectTeamEditor project={project} saving={saving} onUpdated={onUpdated} />

      <ProjectCalendarLink projectId={project.id} />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
          Avancement ({project.progress} %)
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={project.progress}
          disabled={saving}
          onChange={(e) => void patch({ progress: Number(e.target.value) })}
          className="mt-2 w-full accent-primary"
        />
      </label>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Type</dt>
          <dd className="mt-0.5 font-medium">{PROJECT_TYPE_LABELS[project.type]}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Budget</dt>
          <dd className="mt-0.5 font-medium">{formatProjectBudget(project.budget)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Début</dt>
          <dd className="mt-0.5 font-medium">{formatProjectDate(project.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Livraison</dt>
          <dd className="mt-0.5 font-medium">{formatProjectDate(project.dueDate)}</dd>
        </div>
      </dl>

      {project.description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Description</p>
          <p className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-light/70 p-3">
            {project.description}
          </p>
        </div>
      )}

      <ProjectPaymentScheduleEditor project={project} />
      <ProjectMilestonesEditor projectId={project.id} saving={saving} />

      <section className="rounded-xl border border-gray/25 bg-gray-light/20 p-4">
        <h3 className="mb-3 font-bold text-foreground">Timeline / Gantt</h3>
        <ProjectGanttTimeline project={project} />
      </section>

      <ProjectDocumentsPanel
        projectId={project.id}
        clientPortalHref={`/admin/crm/clients`}
      />

      <ProjectArchivePanel project={project} onArchived={onUpdated} />

      <Link
        href="/admin/crm/clients"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        Voir le client →
      </Link>
    </div>
  );
}
