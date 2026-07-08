import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getTaskById } from "@/lib/tasks";
import {
  createAttachmentSchema,
  listTaskAttachments,
  prepareTaskAttachmentUpload,
} from "@/lib/task-attachments";
import { getStorageErrorMessage } from "@/lib/s3-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.tasks.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const task = await getTaskById(id);
    if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });

    const attachments = await listTaskAttachments(id);
    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("[api/admin/tasks/attachments] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.tasks.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const task = await getTaskById(id);
    if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });

    const body = await request.json();
    const parsed = createAttachmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const result = await prepareTaskAttachmentUpload(id, parsed.data);
    return NextResponse.json({
      attachment: result.attachment,
      uploadUrl: result.uploadUrl,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error("[api/admin/tasks/attachments] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : getStorageErrorMessage(error) },
      { status: 502 },
    );
  }
}
