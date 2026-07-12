import type { Task } from "@/lib/tasks";
import { buildTaskAssigneeEmailHtml } from "@/lib/task-email";
import { sendEmail } from "@/lib/email";
import { createAdminTaskNotification } from "@/lib/billing/notifications";
import { getCrmUserEmailByName } from "@/lib/crm-users";

function taskLink(taskId: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/admin/crm/taches?task=${taskId}`;
}

function quoteReferenceFromTask(task: Task): string | null {
  const ref = task.metadata?.quoteReference;
  return typeof ref === "string" && ref.trim() ? ref.trim() : null;
}

function buildDashboardMessage(task: Task, actorName?: string | null): string {
  const parts: string[] = [];
  if (actorName?.trim()) {
    parts.push(`${actorName.trim()} vous a assigné cette tâche.`);
  }
  if (task.clientName) parts.push(`Client : ${task.clientName}.`);
  const quoteRef = quoteReferenceFromTask(task);
  if (quoteRef) parts.push(`Devis : ${quoteRef}.`);
  if (task.dueDate) parts.push(`Échéance : ${task.dueDate}.`);
  return parts.join(" ") || task.title;
}

export async function notifyTaskAssignee(
  task: Task,
  event: "assigned" | "updated",
  options?: { actorName?: string | null },
): Promise<{ emailSent: boolean; notificationCreated: boolean }> {
  if (!task.assignee?.trim()) {
    return { emailSent: false, notificationCreated: false };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const linkHref = taskLink(task.id, siteUrl);
  const dashboardTitle =
    event === "assigned"
      ? `Nouvelle tâche — ${task.title}`
      : `Tâche mise à jour — ${task.title}`;

  let notificationCreated = false;
  try {
    await createAdminTaskNotification({
      recipientName: task.assignee.trim(),
      eventType: event === "assigned" ? "task_assigned" : "task_updated",
      title: dashboardTitle,
      message: buildDashboardMessage(task, options?.actorName),
      linkHref,
      taskId: task.id,
    });
    notificationCreated = true;
  } catch (error) {
    console.error("[task-notifications] dashboard notification failed:", error);
  }

  const email = await getCrmUserEmailByName(task.assignee);
  if (!email) {
    return { emailSent: false, notificationCreated };
  }

  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const subject =
    event === "assigned"
      ? `[CRM] Tâche assignée — ${task.title}`
      : `[CRM] Tâche mise à jour — ${task.title}`;

  const emailSent = await sendEmail({
    to: email,
    subject,
    html: buildTaskAssigneeEmailHtml(task, siteUrl, event, {
      actorName: options?.actorName,
      linkHref,
    }),
    replyTo: fromEmail,
  });

  return { emailSent, notificationCreated };
}
