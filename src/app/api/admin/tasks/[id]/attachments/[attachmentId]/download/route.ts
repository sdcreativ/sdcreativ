import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getTaskAttachmentDownloadUrl } from "@/lib/task-attachments";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { attachmentId } = await context.params;
    const result = await getTaskAttachmentDownloadUrl(attachmentId);
    if (!result) {
      return NextResponse.json({ error: "Pièce jointe introuvable ou S3 non configuré." }, { status: 404 });
    }

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      expiresIn: result.expiresIn,
      filename: result.filename,
    });
  } catch (error) {
    console.error("[api/admin/tasks/attachments/download] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
