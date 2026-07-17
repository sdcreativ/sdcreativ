import type { Project, ProjectMilestone } from "@/lib/projects";
import type { MilestoneStatus, ProjectStatus } from "@/content/projects-labels";
import { parseFetchJson } from "@/lib/fetch-json";

async function parseJson<T>(res: Response): Promise<T> {
  return parseFetchJson<T>(res);
}

/** Première page uniquement (max 100). */
export async function fetchProjects(status?: ProjectStatus): Promise<Project[]> {
  const result = await fetchProjectsPaginated(
    status ? { status, page: 1, pageSize: 100 } : { page: 1, pageSize: 100 },
  );
  return result.projects;
}

export type ProjectListFilters = {
  status?: ProjectStatus;
  assignee?: string;
  clientId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchProjectsPaginated(filters: ProjectListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  const res = await fetch(`/api/admin/projects${qs ? `?${qs}` : ""}`, { credentials: "include" });
  return parseJson<import("@/lib/projects").ProjectListResult>(res);
}

export async function fetchProjectById(id: string): Promise<Project> {
  const res = await fetch(`/api/admin/projects/${id}`, { credentials: "include" });
  const json = await parseJson<{ project: Project }>(res);
  return json.project;
}

export async function createProjectApi(input: Record<string, unknown>): Promise<Project> {
  const res = await fetch("/api/admin/projects", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ project: Project }>(res);
  return json.project;
}

export async function updateProjectApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Project> {
  const res = await fetch(`/api/admin/projects/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ project: Project }>(res);
  return json.project;
}

export async function deleteProjectApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const res = await fetch(`/api/admin/projects/${projectId}/milestones`, {
    credentials: "include",
  });
  const json = await parseJson<{ milestones: ProjectMilestone[] }>(res);
  return json.milestones;
}

export async function updateMilestoneApi(
  projectId: string,
  milestoneId: string,
  input: { status?: MilestoneStatus; label?: string; sortOrder?: number },
): Promise<ProjectMilestone> {
  const res = await fetch(`/api/admin/projects/${projectId}/milestones/${milestoneId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ milestone: ProjectMilestone }>(res);
  return json.milestone;
}

export async function createMilestoneApi(
  projectId: string,
  input: { label: string; status?: MilestoneStatus },
): Promise<ProjectMilestone> {
  const res = await fetch(`/api/admin/projects/${projectId}/milestones`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ milestone: ProjectMilestone }>(res);
  return json.milestone;
}

export async function deleteMilestoneApi(projectId: string, milestoneId: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}/milestones/${milestoneId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchProjectDocuments(projectId: string) {
  const res = await fetch(`/api/admin/projects/${projectId}/documents`, { credentials: "include" });
  const json = await parseJson<{ documents: import("@/lib/s3").StoredDocument[]; hint?: string }>(res);
  return json;
}

export async function presignProjectDocumentUpload(
  projectId: string,
  input: { category: string; filename: string; contentType: string },
) {
  const res = await fetch(`/api/admin/projects/${projectId}/documents`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<{ key: string; uploadUrl: string; expiresIn: number }>(res);
}

export async function fetchProjectNextEvent(projectId: string) {
  const res = await fetch(`/api/admin/projects/${projectId}/next-event`, { credentials: "include" });
  const json = await parseJson<{ event: import("@/lib/calendar").CalendarEvent | null }>(res);
  return json.event;
}

export async function fetchProjectTeamApi(projectId: string) {
  const res = await fetch(`/api/admin/projects/${projectId}/team`, {
    credentials: "include",
  });
  const json = await parseJson<{ members: import("@/lib/project-team").ProjectTeamMember[] }>(res);
  return json.members;
}

export async function setProjectTeamApi(projectId: string, userIds: string[]) {
  const res = await fetch(`/api/admin/projects/${projectId}/team`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });
  const json = await parseJson<{ members: import("@/lib/project-team").ProjectTeamMember[] }>(res);
  return json.members;
}

export async function fetchProjectPaymentMilestonesApi(projectId: string) {
  const res = await fetch(`/api/admin/projects/${projectId}/payment-milestones`, {
    credentials: "include",
  });
  const json = await parseJson<{
    milestones: import("@/lib/project-payment-milestones").ProjectPaymentMilestone[];
  }>(res);
  return json.milestones;
}

export async function replaceProjectPaymentMilestonesApi(
  projectId: string,
  items: Array<{
    label: string;
    amount: number;
    status: import("@/lib/client-portal-payments").PortalPaymentStatus;
    dueDate?: string | null;
  }>,
) {
  const res = await fetch(`/api/admin/projects/${projectId}/payment-milestones`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const json = await parseJson<{
    milestones: import("@/lib/project-payment-milestones").ProjectPaymentMilestone[];
  }>(res);
  return json.milestones;
}

export function getProjectsExportUrl(format: "csv" | "pdf" = "csv"): string {
  return `/api/admin/projects/export?format=${format}`;
}
