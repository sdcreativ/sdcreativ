import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteTaskAttachment } from "@/lib/task-attachments";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { attachmentId } = await context.params;
    const deleted = await deleteTaskAttachment(attachmentId);
    if (!deleted) return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/tasks/attachments/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
