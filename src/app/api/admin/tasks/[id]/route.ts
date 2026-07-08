import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteTask,
  getTaskById,
  updateTask,
  updateTaskSchema,
} from "@/lib/tasks";
import { notifyTaskAssignee } from "@/lib/task-notifications";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.tasks.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (error) {
    console.error("[api/admin/tasks/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.tasks.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await getTaskById(id);
    if (!existing) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const task = await updateTask(id, parsed.data);
    if (!task) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }

    const assigneeChanged =
      parsed.data.assignee !== undefined && parsed.data.assignee !== existing.assignee;
    if (task.assignee && (assigneeChanged || parsed.data.status !== undefined || parsed.data.dueDate !== undefined)) {
      void notifyTaskAssignee(task, assigneeChanged ? "assigned" : "updated").catch((err) => {
        console.error("[api/admin/tasks/id] notify assignee", err);
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("[api/admin/tasks/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.tasks.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteTask(id);
    if (!deleted) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/tasks/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
