"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PROJECT_PIPELINE_COLUMNS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  formatProjectDate,
  type ProjectStatus,
  type ProjectType,
} from "@/content/projects-labels";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { fetchCrmClients } from "@/lib/clients-api";
import { ProjectDetailContent } from "@/components/admin/ProjectDetailContent";
import type { Client } from "@/lib/clients";
import type { Project } from "@/lib/projects";
import {
  createProjectApi,
  deleteProjectApi,
  fetchProjectsPaginated,
  getProjectsExportUrl,
  updateProjectApi,
} from "@/lib/projects-api";
import { ProjectsGanttOverview } from "@/components/admin/ProjectGanttTimeline";
import { KanbanDropColumn, KANBAN_DRAG_MIME } from "@/lib/kanban-dnd";
import { CrmPagination } from "@/components/admin/CrmPagination";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  Calendar,
  Download,
  FolderKanban,
  GanttChart,
  GripVertical,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

const DRAG_PROJECT_MIME = KANBAN_DRAG_MIME.project;

type DueFilter = "all" | "overdue" | "week";
type ViewMode = "kanban" | "list" | "gantt";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmProjectsView() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProjectType | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 50;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, clientList] = await Promise.all([
        fetchProjectsPaginated({
          q: search.trim() || undefined,
          clientId: clientFilter !== "all" ? clientFilter : undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
        fetchCrmClients(),
      ]);
      setProjects(result.projects);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setClients(clientList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les projets.");
      setProjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, clientFilter, page]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setPage(1);
  }, [search, clientFilter, typeFilter, dueFilter]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return projects.filter((project) => {
      if (typeFilter !== "all" && project.type !== typeFilter) return false;
      if (clientFilter !== "all" && project.clientId !== clientFilter) return false;

      if (dueFilter !== "all") {
        if (!project.dueDate) return false;
        const due = new Date(project.dueDate);
        due.setHours(0, 0, 0, 0);
        if (dueFilter === "overdue") {
          if (project.status === "delivered" || due >= today) return false;
        }
        if (dueFilter === "week" && (due < today || due > weekEnd)) return false;
      }

      if (!q) return true;
      return (
        project.name.toLowerCase().includes(q) ||
        project.clientName.toLowerCase().includes(q) ||
        (project.clientCompany?.toLowerCase().includes(q) ?? false) ||
        PROJECT_TYPE_LABELS[project.type].toLowerCase().includes(q)
      );
    });
  }, [projects, search, typeFilter, clientFilter, dueFilter]);

  async function handleStatusChange(project: Project, status: ProjectStatus) {
    if (project.status === status) return;
    setSaving(true);
    try {
      const updated = await updateProjectApi(project.id, { status });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDropOnColumn(targetStatus: ProjectStatus, projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === targetStatus) return;
    await handleStatusChange(project, targetStatus);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer le projet",
      message: "Supprimer ce projet et tous ses jalons ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteProjectApi(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  const pipelineProjects = filteredProjects.filter(
    (p) => p.status !== "on_hold" && p.status !== "cancelled",
  );
  const pausedProjects = filteredProjects.filter(
    (p) => p.status === "on_hold" || p.status === "cancelled",
  );
  const hasActiveFilters =
    search.trim() !== "" || typeFilter !== "all" || clientFilter !== "all" || dueFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          Pilotez l&apos;avancement, les jalons et les livrables — aligné sur l&apos;espace client.
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-gray/60 bg-white p-1">
            {(
              [
                ["kanban", FolderKanban, "Kanban"],
                ["list", LayoutList, "Liste"],
                ["gantt", GanttChart, "Gantt"],
              ] as const
            ).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  viewMode === mode ? "bg-primary text-white" : "text-gray-text hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <a
            href={getProjectsExportUrl("csv")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV
          </a>
          <a
            href={getProjectsExportUrl("pdf")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-primary-light/30"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF
          </a>
          <button
            type="button"
            onClick={() => void loadProjects()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau projet
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {!loading && projects.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gray/30 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative min-w-[12rem] flex-1">
            <span className="sr-only">Rechercher un projet</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher projet, client…"
              className={`${fieldClass} pl-9`}
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ProjectType | "all")}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm"
            aria-label="Filtrer par type"
          >
            <option value="all">Tous les types</option>
            {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm"
            aria-label="Filtrer par client"
          >
            <option value="all">Tous les clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company || client.name}
              </option>
            ))}
          </select>
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as DueFilter)}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm"
            aria-label="Filtrer par échéance"
          >
            <option value="all">Toutes échéances</option>
            <option value="overdue">En retard</option>
            <option value="week">Cette semaine</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setClientFilter("all");
                setDueFilter("all");
              }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Réinitialiser
            </button>
          )}
          <p className="w-full text-xs text-gray-text sm:w-auto sm:ml-auto">
            {filteredProjects.length} projet{filteredProjects.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " (filtrés)" : ""} · glisser-déposer pour changer de colonne
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des projets…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <FolderKanban className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucun projet</p>
          <p className="mt-1 text-sm text-gray-text">
            Créez un projet depuis un{" "}
            <Link href="/admin/crm/clients" className="text-primary hover:underline">
              client
            </Link>{" "}
            pour démarrer le suivi.
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <FolderKanban className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucun projet ne correspond aux filtres</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setClientFilter("all");
              setDueFilter("all");
            }}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === "list" ? (
        <ProjectsListTable
          projects={filteredProjects}
          onOpen={setSelected}
          onStatusChange={handleStatusChange}
          saving={saving}
        />
      ) : viewMode === "gantt" ? (
        <ProjectsGanttOverview projects={filteredProjects} />
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {PROJECT_PIPELINE_COLUMNS.map(({ status, title }) => {
              const column = pipelineProjects.filter((p) => p.status === status);
              const isDropTarget = dragOverColumn === status;
              return (
                <KanbanDropColumn
                  key={status}
                  columnId={status}
                  isDropTarget={isDropTarget}
                  dragMime={DRAG_PROJECT_MIME}
                  onDrop={(projectId) => void handleDropOnColumn(status, projectId)}
                  onDragOverChange={(id) => setDragOverColumn(id as ProjectStatus | null)}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold tracking-wide text-gray-text">{title}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                      {column.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {column.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        dragging={draggingId === project.id}
                        onOpen={() => setSelected(project)}
                        onStatusChange={(next) => void handleStatusChange(project, next)}
                        onDragStart={() => setDraggingId(project.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverColumn(null);
                        }}
                        disabled={saving}
                      />
                    ))}
                    {column.length === 0 && (
                      <p className="px-1 py-6 text-center text-xs text-gray-text">
                        {isDropTarget ? "Déposer ici" : "Aucun projet"}
                      </p>
                    )}
                  </div>
                </KanbanDropColumn>
              );
            })}
          </div>

          {pausedProjects.length > 0 && (
            <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-gray-text">
                EN PAUSE / ANNULÉS ({pausedProjects.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pausedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => setSelected(project)}
                    onStatusChange={(next) => void handleStatusChange(project, next)}
                    disabled={saving}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          <CrmPagination
            page={page}
            totalPages={totalPages}
            total={total}
            label="projet(s)"
            onPageChange={setPage}
          />
        </>
      )}

      {selected && (
        <ProjectDetailPanel
          project={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setSelected(updated);
          }}
          onDelete={() => void handleDelete(selected.id)}
        />
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(project) => {
            setProjects((prev) => [project, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onStatusChange,
  onDragStart,
  onDragEnd,
  disabled,
  compact,
  dragging,
}: {
  project: Project;
  onOpen: () => void;
  onStatusChange: (status: ProjectStatus) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled: boolean;
  compact?: boolean;
  dragging?: boolean;
}) {
  const isOverdue =
    project.dueDate &&
    project.status !== "delivered" &&
    new Date(project.dueDate) < new Date(new Date().toDateString());

  return (
    <article
      draggable={!compact}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_PROJECT_MIME, project.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "rounded-xl border border-gray/40 bg-white shadow-sm transition-shadow hover:shadow-md",
        dragging && "opacity-50 ring-2 ring-primary/30",
        compact && "p-2.5",
      )}
    >
      <div className={cn("p-3", compact && "p-0")}>
        <div className="flex items-start gap-1.5">
          {!compact && (
            <span
              className="mt-0.5 cursor-grab text-gray-text/50 active:cursor-grabbing"
              aria-hidden
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="text-sm font-bold leading-snug text-foreground">{project.name}</h3>
          </button>
          <Link
            href={`/admin/crm/projets/${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-[10px] font-semibold text-primary hover:underline"
          >
            Détail
          </Link>
          {!compact && (
            <select
              value={project.status}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
              className="max-w-[7rem] shrink-0 rounded-lg border border-gray/50 px-1.5 py-1 text-[10px] font-semibold"
              aria-label="Changer le statut"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
        <button type="button" onClick={onOpen} className="w-full text-left">
          <p className="mt-1 text-xs text-gray-text">
            {project.clientCompany || project.clientName}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-text">{PROJECT_TYPE_LABELS[project.type]}</p>
          {project.assignee && (
            <p className="mt-1 text-[10px] font-medium text-primary">{project.assignee}</p>
          )}
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[10px] font-medium text-gray-text">
              <span>Avancement</span>
              <span className="text-primary">{project.progress} %</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-light">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
          {project.dueDate && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-[10px]",
                isOverdue ? "font-semibold text-accent" : "text-gray-text",
              )}
            >
              <Calendar className="h-3 w-3" aria-hidden />
              Livraison {formatProjectDate(project.dueDate)}
              {isOverdue && " · En retard"}
            </p>
          )}
        </button>
      </div>
    </article>
  );
}

function ProjectsListTable({
  projects,
  onOpen,
  onStatusChange,
  saving,
}: {
  projects: Project[];
  onOpen: (project: Project) => void;
  onStatusChange: (project: Project, status: ProjectStatus) => void;
  saving: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray/40 bg-white shadow-sm">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray/40 text-xs uppercase tracking-wide text-gray-text">
            <th className="px-4 py-3 font-semibold">Projet</th>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 font-semibold">Chef de projet</th>
            <th className="px-4 py-3 font-semibold">Progression</th>
            <th className="px-4 py-3 font-semibold">Livraison</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray/30">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-light/30">
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpen(project)}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  {project.name}
                </button>
                <p className="text-xs text-gray-text">{PROJECT_TYPE_LABELS[project.type]}</p>
              </td>
              <td className="px-4 py-3 text-gray-text">{project.clientCompany || project.clientName}</td>
              <td className="px-4 py-3">
                <label htmlFor={`project-status-${project.id}`} className="sr-only">
                  Statut du projet {project.name}
                </label>
                <select
                  id={`project-status-${project.id}`}
                  value={project.status}
                  disabled={saving}
                  onChange={(e) => onStatusChange(project, e.target.value as ProjectStatus)}
                  className="rounded-lg border border-gray/50 px-2 py-1 text-xs"
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-gray-text">{project.assignee ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-light">
                    <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
                  </div>
                  <span className="text-xs">{project.progress} %</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-text">{formatProjectDate(project.dueDate)}</td>
              <td className="px-4 py-3">
                <Link href={`/admin/crm/projets/${project.id}`} className="text-xs font-semibold text-primary hover:underline">
                  Ouvrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectDetailPanel({
  project,
  saving,
  onClose,
  onUpdated,
  onDelete,
}: {
  project: Project;
  saving: boolean;
  onClose: () => void;
  onUpdated: (project: Project) => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
          <div>
            <h2 className="font-bold text-foreground">{project.name}</h2>
            <p className="text-sm text-gray-text">{project.clientCompany || project.clientName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-light" aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ProjectDetailContent
            project={project}
            saving={saving}
            onUpdated={onUpdated}
            showPageLink
          />
        </div>

        <div className="flex gap-2 border-t border-gray/40 px-5 py-4">
          <Link
            href={`/admin/crm/projets/${project.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/30"
          >
            Page complète
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            aria-label="Supprimer le projet"
            className="inline-flex items-center justify-center rounded-xl border border-accent/30 px-4 py-2.5 text-accent hover:bg-accent/5"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const assignees = useCrmAssignees();

  useEffect(() => {
    void fetchCrmClients()
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    try {
      const assigneeRaw = String(data.get("assignee") || "");
      const assignee =
        assigneeRaw && assigneeRaw !== "Non assigné" ? assigneeRaw : null;

      const project = await createProjectApi({
        clientId: String(data.get("clientId")),
        name: String(data.get("name")),
        type: String(data.get("type") || "site_vitrine"),
        status: String(data.get("status") || "discovery"),
        startDate: String(data.get("startDate") || "") || null,
        dueDate: String(data.get("dueDate") || "") || null,
        budget: data.get("budget") ? Number(data.get("budget")) : null,
        description: String(data.get("description") || "") || null,
        assignee,
        seedMilestones: true,
      });
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Nouveau projet</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-text" aria-hidden />
          </button>
        </div>

        {loadingClients ? (
          <p className="flex items-center gap-2 text-sm text-gray-text">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement des clients…
          </p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-text">
            Aucun client disponible.{" "}
            <Link href="/admin/crm/clients" className="text-primary hover:underline">
              Créez un client
            </Link>{" "}
            d&apos;abord.
          </p>
        ) : (
          <>
            <div className="grid gap-3">
              <select name="clientId" required className={fieldClass} aria-label="Client">
                <option value="">Client *</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company || client.name}
                  </option>
                ))}
              </select>
              <input name="name" required placeholder="Nom du projet *" className={fieldClass} />
              <select name="type" defaultValue="site_vitrine" className={fieldClass} aria-label="Type">
                {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="status" defaultValue="discovery" className={fieldClass} aria-label="Statut">
                {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="assignee" defaultValue="" className={fieldClass} aria-label="Assigné à">
                <option value="">Non assigné</option>
                {assignees.map((member) => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="startDate" type="date" className={fieldClass} aria-label="Date de début" />
                <input name="dueDate" type="date" className={fieldClass} aria-label="Date de livraison" />
              </div>
              <input name="budget" type="number" min={0} placeholder="Budget (FCFA)" className={fieldClass} />
            </div>
            <textarea name="description" placeholder="Description / périmètre" rows={3} className={`${fieldClass} mt-3`} />
            {error && <p className="mt-3 text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Créer avec jalons par défaut
            </button>
          </>
        )}
      </form>
    </div>
  );
}
