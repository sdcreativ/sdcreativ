"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TASK_CATEGORIES,
  TASK_PIPELINE_COLUMNS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  buildQuoteFollowUpDescription,
  buildTaskTitle,
  formatTaskDate,
  isTaskOverdue,
  priorityStyles,
  type TaskCategoryId,
  type TaskStatus,
} from "@/content/tasks-labels";
import { QUOTE_STATUS_LABELS, formatQuoteAmount } from "@/content/quotes-labels";
import { fetchQuotes } from "@/lib/quotes-api";
import type { Quote } from "@/lib/quotes";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Client } from "@/lib/clients";
import { fetchProjects } from "@/lib/projects-api";
import type { Project } from "@/lib/projects";
import type { Task } from "@/lib/tasks";
import {
  createTaskApi,
  deleteTaskApi,
  fetchTaskStats,
  fetchTasks,
  updateTaskApi,
  type TaskListFilters,
} from "@/lib/tasks-api";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { KanbanDropColumn, KANBAN_DRAG_MIME } from "@/lib/kanban-dnd";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { TaskSubtasksSection } from "@/components/admin/TaskSubtasksSection";
import { TaskCommentsSection } from "@/components/admin/TaskCommentsSection";
import { TaskAttachmentsSection } from "@/components/admin/TaskAttachmentsSection";
import { TasksMonthCalendar } from "@/components/admin/TasksMonthCalendar";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckSquare,
  Columns3,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";

type ViewMode = "kanban" | "calendar";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmTasksView() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const teamAssignees = useCrmAssignees();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selected, setSelected] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const listFilters = useMemo((): TaskListFilters => ({
    q: search.trim() || undefined,
    assignee: assigneeFilter !== "all" ? assigneeFilter : undefined,
  }), [search, assigneeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksData, statsData] = await Promise.all([
        fetchTasks(listFilters),
        fetchTaskStats(),
      ]);
      setTasks(tasksData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les tâches.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [listFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
    const assignee = searchParams.get("assignee");
    if (assignee) setAssigneeFilter(decodeURIComponent(assignee));
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId || tasks.length === 0) return;
    const match = tasks.find((task) => task.id === taskId);
    if (match) setSelected(match);
  }, [searchParams, tasks]);

  const filtered = tasks;

  const assigneeOptions = useMemo(() => {
    const set = new Set(teamAssignees);
    for (const task of tasks) {
      if (task.assignee) set.add(task.assignee);
    }
    return [...set].sort();
  }, [teamAssignees, tasks]);

  async function handleStatusChange(task: Task, status: TaskStatus) {
    setSaving(true);
    try {
      const updated = await updateTaskApi(task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
      setStats(await fetchTaskStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer la tâche",
      message: "Supprimer cette tâche ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteTaskApi(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelected(null);
      setStats(await fetchTaskStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDropOnColumn(targetStatus: TaskStatus, taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    await handleStatusChange(task, targetStatus);
  }

  const assignees = assigneeOptions;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          To-do partagée — échéances et assignation par projet ou commercial. Glisser-déposer entre colonnes.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
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
            Nouvelle tâche
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="À faire" value={stats.todo} />
        <StatCard label="En cours" value={stats.inProgress} />
        <StatCard label="Terminées" value={stats.done} />
        <StatCard
          label="En retard"
          value={stats.overdue}
          alert={stats.overdue > 0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une tâche…"
            className="w-full rounded-xl border border-gray/60 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Rechercher une tâche"
          />
        </label>
        <label className="text-sm">
          <span className="mr-2 font-medium text-gray-text">Assigné à</span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Toute l&apos;équipe</option>
            {assignees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className="inline-flex rounded-xl border border-gray/60 bg-white p-1">
          {([
            ["kanban", Columns3, "Kanban"],
            ["calendar", CalendarDays, "Calendrier"],
          ] as const).map(([mode, Icon, label]) => (
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
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des tâches…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <CheckSquare className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucune tâche</p>
          <p className="mt-1 text-sm text-gray-text">
            Créez une tâche pour planifier relances, livrables et points d&apos;étape.
          </p>
        </div>
      ) : viewMode === "calendar" ? (
        <TasksMonthCalendar
          tasks={filtered}
          onOpenTask={(task) => setSelected(task)}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {TASK_PIPELINE_COLUMNS.map(({ status, title }) => {
            const column = filtered.filter((t) => t.status === status);
            return (
              <KanbanDropColumn
                key={status}
                columnId={status}
                isDropTarget={dragOverColumn === status}
                dragMime={KANBAN_DRAG_MIME.task}
                onDrop={(taskId) => void handleDropOnColumn(status, taskId)}
                onDragOverChange={(id) => setDragOverColumn(id as TaskStatus | null)}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold tracking-wide text-gray-text">{title}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                    {column.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {column.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      dragging={draggingId === task.id}
                      onOpen={() => setSelected(task)}
                      onStatusChange={(next) => void handleStatusChange(task, next)}
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverColumn(null);
                      }}
                      disabled={saving}
                    />
                  ))}
                  {column.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-gray-text">
                      {dragOverColumn === status ? "Déposer ici" : "Aucune tâche"}
                    </p>
                  )}
                </div>
              </KanbanDropColumn>
            );
          })}
        </div>
      )}

      {selected && (
        <TaskDetailPanel
          task={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setSelected(updated);
          }}
          onDelete={() => void handleDelete(selected.id)}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={(task) => {
            setTasks((prev) => [task, ...prev]);
            setShowCreate(false);
            void fetchTaskStats().then(setStats);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray/40 bg-white p-4 shadow-sm",
        alert && "border-accent/40 bg-accent/5",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", alert ? "text-accent" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onStatusChange,
  onDragStart,
  onDragEnd,
  disabled,
  dragging,
}: {
  task: Task;
  onOpen: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled: boolean;
  dragging?: boolean;
}) {
  const overdue = isTaskOverdue(task.dueDate, task.status);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(KANBAN_DRAG_MIME.task, task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "rounded-xl border border-gray/40 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
        dragging && "opacity-50 ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-gray-text/40" aria-hidden />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="text-sm font-bold leading-snug text-foreground">{task.title}</h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", priorityStyles[task.priority])}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Retard
              </span>
            )}
          </div>

          {task.assignee && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-text">
              <User className="h-3 w-3" aria-hidden />
              {task.assignee}
            </p>
          )}

          {(task.projectName || task.clientName) && (
            <p className="mt-1 truncate text-[11px] text-gray-text">
              {task.projectName ?? task.clientName}
            </p>
          )}

          {task.dueDate && (
            <p className={cn("mt-2 flex items-center gap-1 text-[10px]", overdue ? "font-semibold text-accent" : "text-gray-text")}>
              <Calendar className="h-3 w-3" aria-hidden />
              {formatTaskDate(task.dueDate)}
            </p>
          )}
        </button>
      </div>
      <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-gray-text">
        Statut
        <select
          value={task.status}
          disabled={disabled}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="mt-1 w-full rounded-lg border border-gray/50 px-2 py-1.5 text-xs"
          aria-label={`Statut de ${task.title}`}
        >
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
    </article>
  );
}

function TaskDetailPanel({
  task,
  saving,
  onClose,
  onUpdated,
  onDelete,
}: {
  task: Task;
  saving: boolean;
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDelete: () => void;
}) {
  const assignees = useCrmAssignees();

  async function handlePatch(input: Record<string, unknown>) {
    const updated = await updateTaskApi(task.id, input);
    onUpdated(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
          <h2 className="font-bold text-foreground">{task.title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-light" aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
            <select
              value={task.status}
              disabled={saving}
              onChange={(e) => void handlePatch({ status: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Priorité</span>
            <select
              value={task.priority}
              disabled={saving}
              onChange={(e) => void handlePatch({ priority: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Assigné à</span>
            <select
              value={task.assignee ?? ""}
              disabled={saving}
              onChange={(e) => void handlePatch({ assignee: e.target.value || null })}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              <option value="">Non assigné</option>
              {assignees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Échéance</span>
            <input
              type="date"
              value={task.dueDate ?? ""}
              disabled={saving}
              onChange={(e) => void handlePatch({ dueDate: e.target.value || null })}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            />
          </label>

          {task.projectName && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Projet</p>
              <p className="mt-0.5 font-medium">{task.projectName}</p>
            </div>
          )}

          {task.clientName && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Client</p>
              <p className="mt-0.5 font-medium">{task.clientName}</p>
            </div>
          )}

          {typeof task.metadata?.quoteReference === "string" && task.metadata.quoteReference && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Devis lié</p>
              <p className="mt-0.5 font-mono font-medium">{task.metadata.quoteReference}</p>
            </div>
          )}

          {task.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Description</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-light/70 p-3">{task.description}</p>
            </div>
          )}

          <TaskSubtasksSection taskId={task.id} />
          <TaskCommentsSection taskId={task.id} />
          <TaskAttachmentsSection taskId={task.id} />
        </div>

        <div className="border-t border-gray/40 px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 py-2.5 text-sm font-medium text-accent hover:bg-accent/5"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientQuotes, setClientQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState<TaskCategoryId>("quote_follow_up");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const assignees = useCrmAssignees();

  useEffect(() => {
    void Promise.all([fetchProjects(), fetchCrmClients()])
      .then(([p, c]) => {
        setProjects(p);
        setClients(c);
      })
      .catch(() => {
        setProjects([]);
        setClients([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setClientQuotes([]);
      setSelectedQuoteId("");
      return;
    }

    setQuotesLoading(true);
    void fetchQuotes({ clientId: selectedClientId })
      .then((quotes) => {
        setClientQuotes(quotes);
        if (quotes.length === 1) {
          setSelectedQuoteId(quotes[0]!.id);
        } else {
          setSelectedQuoteId("");
        }
      })
      .catch(() => setClientQuotes([]))
      .finally(() => setQuotesLoading(false));
  }, [selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedQuote = clientQuotes.find((quote) => quote.id === selectedQuoteId) ?? null;
  const previewTitle = buildTaskTitle({
    categoryId,
    customTitle,
    clientName: selectedClient?.company || selectedClient?.name || null,
    quoteReference: selectedQuote?.reference ?? null,
  });

  useEffect(() => {
    if (categoryId !== "quote_follow_up" || !selectedQuote) return;
    const sentAt = selectedQuote.sentAt ?? selectedQuote.createdAt;
    const sentDaysAgo = sentAt
      ? Math.max(0, Math.floor((Date.now() - new Date(sentAt).getTime()) / 86_400_000))
      : null;
    setDescription(
      buildQuoteFollowUpDescription({
        quoteReference: selectedQuote.reference,
        amountLabel: formatQuoteAmount(selectedQuote.subtotal),
        statusLabel: QUOTE_STATUS_LABELS[selectedQuote.status],
        sentDaysAgo,
      }),
    );
  }, [categoryId, selectedQuote]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const assignee = String(data.get("assignee") || "") || null;

    if (categoryId === "custom" && !customTitle.trim()) {
      setError("Indiquez un titre personnalisé.");
      setLoading(false);
      return;
    }

    if (clientQuotes.length > 1 && selectedClientId && !selectedQuoteId) {
      setError("Sélectionnez le devis concerné.");
      setLoading(false);
      return;
    }

    try {
      const task = await createTaskApi({
        title: previewTitle,
        description: description.trim() || null,
        priority: String(data.get("priority") || "medium"),
        status: "todo",
        dueDate: String(data.get("dueDate") || "") || null,
        assignee,
        projectId: String(data.get("projectId") || "") || null,
        clientId: selectedClientId || null,
        metadata: {
          categoryId,
          customTitle: categoryId === "custom" ? customTitle.trim() : null,
          quoteId: selectedQuote?.id ?? null,
          quoteReference: selectedQuote?.reference ?? null,
        },
      });
      onCreated(task);
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
          <h2 className="text-lg font-bold text-foreground">Nouvelle tâche</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-text" aria-hidden />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Catégorie
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value as TaskCategoryId)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
            >
              {TASK_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          {categoryId === "custom" && (
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              required
              placeholder="Titre personnalisé *"
              className={fieldClass}
            />
          )}

          <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Titre généré</p>
            <p className="mt-1 font-medium text-foreground">{previewTitle}</p>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={4}
            className={fieldClass}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select name="priority" defaultValue="medium" className={fieldClass} aria-label="Priorité">
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input name="dueDate" type="date" className={fieldClass} aria-label="Échéance" />
          </div>

          <select name="assignee" defaultValue="" className={fieldClass} aria-label="Assigné à">
            <option value="">Non assigné</option>
            {assignees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className={fieldClass}
            aria-label="Client lié"
          >
            <option value="">Client (optionnel)</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company || client.name}
              </option>
            ))}
          </select>

          {selectedClientId && quotesLoading && (
            <p className="text-sm text-gray-text">Chargement des devis…</p>
          )}

          {selectedClientId && !quotesLoading && clientQuotes.length === 0 && (
            <p className="rounded-xl bg-gray-light/60 px-3 py-2 text-xs text-gray-text">
              Aucun devis lié à ce client.
            </p>
          )}

          {selectedClientId && !quotesLoading && clientQuotes.length > 1 && (
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Devis concerné *
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
              >
                <option value="">Choisir un devis</option>
                {clientQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.reference} — {formatQuoteAmount(quote.subtotal)} — {QUOTE_STATUS_LABELS[quote.status]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedClientId && !quotesLoading && clientQuotes.length === 1 && selectedQuote && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              Devis lié : <strong>{selectedQuote.reference}</strong> ({formatQuoteAmount(selectedQuote.subtotal)} HT)
            </p>
          )}

          <select name="projectId" className={fieldClass} aria-label="Projet lié">
            <option value="">Projet (optionnel)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Créer la tâche
        </button>
      </form>
    </div>
  );
}
