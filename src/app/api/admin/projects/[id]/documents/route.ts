import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getClientById } from "@/lib/clients";
import { getProjectById } from "@/lib/projects";
import {
  buildProjectDocumentKey,
  createPresignedUploadUrl,
  isS3Configured,
  listProjectDocuments,
  type DocumentCategory,
} from "@/lib/s3";
import { DOCUMENT_CATEGORIES } from "@/lib/s3";
import { getStorageErrorMessage } from "@/lib/s3-errors";

const uploadSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES),
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
});

type RouteContext = { params: Promise<{ id: string }> };

async function resolveProjectContext(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) return null;
  const client = await getClientById(project.clientId);
  if (!client?.portalClientId) return { project, client, portalClientId: null as string | null };
  return { project, client, portalClientId: client.portalClientId };
}

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "documents.read" });
  if (authError) return authError;

  if (!isS3Configured()) {
    return NextResponse.json({ error: "Stockage S3 non configuré." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const ctx = await resolveProjectContext(id);
    if (!ctx) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    if (!ctx.portalClientId) {
      return NextResponse.json({
        documents: [],
        hint: "Liez un compte espace client pour activer les documents projet.",
      });
    }

    const documents = await listProjectDocuments(ctx.portalClientId, id);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[api/admin/projects/documents] GET", error);
    return NextResponse.json({ error: getStorageErrorMessage(error) }, { status: 502 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "documents.write" });
  if (authError) return authError;

  if (!isS3Configured()) {
    return NextResponse.json({ error: "Stockage S3 non configuré." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const ctx = await resolveProjectContext(id);
    if (!ctx) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    if (!ctx.portalClientId) {
      return NextResponse.json(
        { error: "Compte espace client requis pour uploader des documents projet." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const key = buildProjectDocumentKey(
      ctx.portalClientId,
      id,
      parsed.data.category as DocumentCategory,
      parsed.data.filename,
    );
    const { uploadUrl, expiresIn } = await createPresignedUploadUrl(key, parsed.data.contentType);

    return NextResponse.json({ key, uploadUrl, expiresIn });
  } catch (error) {
    console.error("[api/admin/projects/documents] POST", error);
    return NextResponse.json({ error: getStorageErrorMessage(error) }, { status: 502 });
  }
}
