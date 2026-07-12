import type { Task } from "@/lib/tasks";
import { formatTaskDate } from "@/content/tasks-labels";
import { escapeHtml } from "@/lib/email";

export function buildTaskAssigneeEmailHtml(
  task: Task,
  siteUrl: string,
  event: "assigned" | "updated",
  options?: { actorName?: string | null; linkHref?: string },
): string {
  const actionLabel = event === "assigned" ? "assignée" : "mise à jour";
  const dueLine = task.dueDate
    ? `<p style="margin:0 0 8px"><strong>Échéance :</strong> ${formatTaskDate(task.dueDate)}</p>`
    : "";
  const quoteRef =
    typeof task.metadata?.quoteReference === "string" ? task.metadata.quoteReference.trim() : "";
  const quoteLine = quoteRef
    ? `<p style="margin:0 0 8px"><strong>Devis :</strong> ${escapeHtml(quoteRef)}</p>`
    : "";
  const actorLine = options?.actorName?.trim()
    ? `<p style="margin:0 0 12px">${escapeHtml(options.actorName.trim())} vous a ${actionLabel} cette tâche.</p>`
    : `<p style="margin:0 0 12px">Une tâche vous a été ${actionLabel} dans le CRM SD CREATIV.</p>`;
  const descriptionLine = task.description?.trim()
    ? `<p style="margin:12px 0 0;font-size:13px;color:#4b5563;white-space:pre-wrap">${escapeHtml(task.description.trim())}</p>`
    : "";
  const href = options?.linkHref ?? `${siteUrl.replace(/\/$/, "")}/admin/crm/taches`;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p>Bonjour ${escapeHtml(task.assignee ?? "")},</p>
    ${actorLine}
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Tâche</p>
      <p style="margin:0 0 8px;font-size:16px;font-weight:700">${escapeHtml(task.title)}</p>
      ${dueLine}
      ${quoteLine}
      ${task.projectName ? `<p style="margin:0 0 8px"><strong>Projet :</strong> ${escapeHtml(task.projectName)}</p>` : ""}
      ${task.clientName ? `<p style="margin:0"><strong>Client :</strong> ${escapeHtml(task.clientName)}</p>` : ""}
      ${descriptionLine}
    </div>
    <p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700">Ouvrir la tâche</a></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#9ca3af">SD CREATIV — ${escapeHtml(siteUrl)}</p>
  </div>`;
}
