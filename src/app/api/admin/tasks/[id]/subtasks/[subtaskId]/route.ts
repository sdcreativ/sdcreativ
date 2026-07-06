import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteTaskSubtask,
  updateSubtaskSchema,
  updateTaskSubtask,
} from "@/lib/task-subtasks";

type RouteContext = { params: Promise<{ id: string; subtaskId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { subtaskId } = await context.params;
    const body = await request.json();
    const parsed = updateSubtaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const subtask = await updateTaskSubtask(subtaskId, parsed.data);
    if (!subtask) return NextResponse.json({ error: "Sous-tâche introuvable." }, { status: 404 });

    return NextResponse.json({ subtask });
  } catch (error) {
    console.error("[api/admin/tasks/subtasks/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { subtaskId } = await context.params;
    const deleted = await deleteTaskSubtask(subtaskId);
    if (!deleted) return NextResponse.json({ error: "Sous-tâche introuvable." }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/tasks/subtasks/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
