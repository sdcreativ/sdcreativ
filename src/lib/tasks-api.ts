import type { Task } from "@/lib/tasks";
import type { TaskStatus } from "@/content/tasks-labels";
import type { TaskListFilters } from "@/lib/tasks";
import type { TaskSubtask } from "@/lib/task-subtasks";
import type { TaskComment } from "@/lib/task-comments";
import type { TaskAttachment } from "@/lib/task-attachments";
import { parseFetchJson } from "@/lib/fetch-json";

async function parseJson<T>(res: Response): Promise<T> {
  return parseFetchJson<T>(res);
}

export async function fetchTasks(params?: TaskListFilters): Promise<Task[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.assignee) search.set("assignee", params.assignee);
  if (params?.projectId) search.set("projectId", params.projectId);
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();

  const res = await fetch(`/api/admin/tasks${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseJson<{ tasks: Task[] }>(res);
  return json.tasks;
}

export async function fetchTaskStats(): Promise<{
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}> {
  const res = await fetch("/api/admin/tasks/stats", { credentials: "include" });
  return parseJson(res);
}

export async function createTaskApi(input: Record<string, unknown>): Promise<Task> {
  const res = await fetch("/api/admin/tasks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ task: Task }>(res);
  return json.task;
}

export async function updateTaskApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Task> {
  const res = await fetch(`/api/admin/tasks/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ task: Task }>(res);
  return json.task;
}

export async function deleteTaskApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/tasks/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchTaskSubtasks(taskId: string): Promise<TaskSubtask[]> {
  const res = await fetch(`/api/admin/tasks/${taskId}/subtasks`, { credentials: "include" });
  const json = await parseJson<{ subtasks: TaskSubtask[] }>(res);
  return json.subtasks;
}

export async function createTaskSubtaskApi(taskId: string, title: string): Promise<TaskSubtask> {
  const res = await fetch(`/api/admin/tasks/${taskId}/subtasks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const json = await parseJson<{ subtask: TaskSubtask }>(res);
  return json.subtask;
}

export async function updateTaskSubtaskApi(
  taskId: string,
  subtaskId: string,
  input: { title?: string; done?: boolean },
): Promise<TaskSubtask> {
  const res = await fetch(`/api/admin/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ subtask: TaskSubtask }>(res);
  return json.subtask;
}

export async function deleteTaskSubtaskApi(taskId: string, subtaskId: string): Promise<void> {
  const res = await fetch(`/api/admin/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  const res = await fetch(`/api/admin/tasks/${taskId}/comments`, { credentials: "include" });
  const json = await parseJson<{ comments: TaskComment[] }>(res);
  return json.comments;
}

export async function createTaskCommentApi(
  taskId: string,
  input: { content: string; actorName?: string | null },
): Promise<TaskComment> {
  const res = await fetch(`/api/admin/tasks/${taskId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ comment: TaskComment }>(res);
  return json.comment;
}

export async function fetchTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const res = await fetch(`/api/admin/tasks/${taskId}/attachments`, { credentials: "include" });
  const json = await parseJson<{ attachments: TaskAttachment[] }>(res);
  return json.attachments;
}

export async function prepareTaskAttachmentUploadApi(
  taskId: string,
  input: { filename: string; contentType: string; sizeBytes?: number; uploadedBy?: string | null },
): Promise<{ attachment: TaskAttachment; uploadUrl: string }> {
  const res = await fetch(`/api/admin/tasks/${taskId}/attachments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ attachment: TaskAttachment; uploadUrl: string }>(res);
  return json;
}

export async function getTaskAttachmentDownloadUrlApi(
  taskId: string,
  attachmentId: string,
): Promise<string> {
  const res = await fetch(`/api/admin/tasks/${taskId}/attachments/${attachmentId}/download`, {
    credentials: "include",
  });
  const json = await parseJson<{ downloadUrl: string }>(res);
  return json.downloadUrl;
}

export async function deleteTaskAttachmentApi(taskId: string, attachmentId: string): Promise<void> {
  const res = await fetch(`/api/admin/tasks/${taskId}/attachments/${attachmentId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export type { TaskStatus, TaskListFilters };
