import type { Task } from "@/lib/tasks";
import { formatTaskDate } from "@/content/tasks-labels";
import { escapeHtml } from "@/lib/email";

export function buildTaskAssigneeEmailHtml(
  task: Task,
  siteUrl: string,
  event: "assigned" | "updated",
): string {
  const actionLabel = event === "assigned" ? "assignée" : "mise à jour";
  const dueLine = task.dueDate
    ? `<p style="margin:0 0 8px"><strong>Échéance :</strong> ${formatTaskDate(task.dueDate)}</p>`
    : "";

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p>Bonjour ${escapeHtml(task.assignee ?? "")},</p>
    <p>Une tâche vous a été ${actionLabel} dans le CRM SD CREATIV.</p>
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Tâche</p>
      <p style="margin:0 0 8px;font-size:16px;font-weight:700">${escapeHtml(task.title)}</p>
      ${dueLine}
      ${task.projectName ? `<p style="margin:0 0 8px"><strong>Projet :</strong> ${escapeHtml(task.projectName)}</p>` : ""}
      ${task.clientName ? `<p style="margin:0"><strong>Client :</strong> ${escapeHtml(task.clientName)}</p>` : ""}
    </div>
    <p><a href="${escapeHtml(siteUrl)}/admin/crm/taches" style="color:#1e40af">Ouvrir les tâches CRM</a></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#9ca3af">SD CREATIV — ${escapeHtml(siteUrl)}</p>
  </div>`;
}
