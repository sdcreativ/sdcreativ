"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskSubtask } from "@/lib/task-subtasks";
import {
  createTaskSubtaskApi,
  deleteTaskSubtaskApi,
  fetchTaskSubtasks,
  updateTaskSubtaskApi,
} from "@/lib/tasks-api";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function TaskSubtasksSection({ taskId }: { taskId: string }) {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubtasks(await fetchTaskSubtasks(taskId));
    } catch {
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const subtask = await createTaskSubtaskApi(taskId, title);
      setSubtasks((prev) => [...prev, subtask]);
      setNewTitle("");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(subtask: TaskSubtask) {
    const updated = await updateTaskSubtaskApi(taskId, subtask.id, { done: !subtask.done });
    setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function handleDelete(subtaskId: string) {
    await deleteTaskSubtaskApi(taskId, subtaskId);
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
  }

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Sous-tâches</p>
        {subtasks.length > 0 && (
          <span className="text-[10px] font-medium text-gray-text">{doneCount}/{subtasks.length}</span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-text">Chargement…</p>
      ) : (
        <ul className="space-y-1.5">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2 rounded-lg bg-gray-light/60 px-2 py-1.5">
              <button
                type="button"
                onClick={() => void toggleDone(subtask)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  subtask.done ? "border-primary bg-primary text-white" : "border-gray/60 bg-white",
                )}
                aria-label={subtask.done ? "Marquer non terminée" : "Marquer terminée"}
              >
                {subtask.done && <Check className="h-3 w-3" aria-hidden />}
              </button>
              <span className={cn("min-w-0 flex-1 text-sm", subtask.done && "text-gray-text line-through")}>
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => void handleDelete(subtask.id)}
                className="rounded p-1 text-gray-text hover:text-accent"
                aria-label="Supprimer la sous-tâche"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-2 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nouvelle sous-tâche…"
          className={fieldClass}
          aria-label="Titre de la sous-tâche"
        />
        <button
          type="submit"
          disabled={saving || !newTitle.trim()}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-3 text-white hover:bg-primary-dark disabled:opacity-50"
          aria-label="Ajouter une sous-tâche"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
