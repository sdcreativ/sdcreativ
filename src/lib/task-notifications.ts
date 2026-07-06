import type { Task } from "@/lib/tasks";
import { buildTaskAssigneeEmailHtml } from "@/lib/task-email";
import { sendEmail } from "@/lib/email";
import { getCrmUserEmailByName } from "@/lib/crm-users";

export async function notifyTaskAssignee(
  task: Task,
  event: "assigned" | "updated",
): Promise<boolean> {
  if (!task.assignee?.trim()) return false;

  const email = await getCrmUserEmailByName(task.assignee);
  if (!email) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
  const subject =
    event === "assigned"
      ? `[CRM] Tâche assignée — ${task.title}`
      : `[CRM] Tâche mise à jour — ${task.title}`;

  return sendEmail({
    to: email,
    subject,
    html: buildTaskAssigneeEmailHtml(task, siteUrl, event),
    replyTo: fromEmail,
  });
}
