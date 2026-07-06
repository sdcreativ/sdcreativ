import { NextResponse } from "next/server";
import {
  canAccessClient,
  isClientUploadCategory,
  verifyDocumentsAuth,
} from "@/lib/documents-auth";
import {
  buildDocumentKey,
  createPresignedUploadUrl,
  deleteDocument,
  isS3Configured,
  listClientDocuments,
} from "@/lib/s3";
import { getStorageErrorMessage } from "@/lib/s3-errors";
import {
  documentDeleteSchema,
  documentListQuerySchema,
  documentUploadSchema,
} from "@/lib/validations/documents";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function s3UnavailableResponse() {
  return NextResponse.json(
    {
      error:
        "Stockage documents non configuré. Ajoutez les variables AWS S3 sur Vercel.",
    },
    { status: 503 },
  );
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    if (!isS3Configured()) return s3UnavailableResponse();

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const auth = await verifyDocumentsAuth(request);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const parsed = documentListQuerySchema.safeParse({
      clientId: searchParams.get("clientId"),
      category: searchParams.get("category") ?? undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Paramètres invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { clientId, category } = parsed.data;
    if (!canAccessClient(auth, clientId)) {
      return unauthorizedResponse();
    }

    const documents = await listClientDocuments(clientId, category);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[api/documents] GET", error);
    return NextResponse.json(
      { error: getStorageErrorMessage(error) },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isS3Configured()) return s3UnavailableResponse();

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une heure." },
        { status: 429 },
      );
    }

    const auth = await verifyDocumentsAuth(request);
    if (!auth) return unauthorizedResponse();

    const body = await request.json();
    const parsed = documentUploadSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { clientId, category, filename, contentType } = parsed.data;

    if (!canAccessClient(auth, clientId)) {
      return unauthorizedResponse();
    }

    if (auth.role === "client" && !isClientUploadCategory(category)) {
      return NextResponse.json(
        { error: "Les clients ne peuvent déposer que dans la catégorie uploads." },
        { status: 403 },
      );
    }

    const key = buildDocumentKey(clientId, category, filename);
    const { uploadUrl, expiresIn } = await createPresignedUploadUrl(key, contentType);

    return NextResponse.json({
      key,
      uploadUrl,
      expiresIn,
      maxBytes: 10 * 1024 * 1024,
    });
  } catch (error) {
    console.error("[api/documents] POST", error);
    return NextResponse.json(
      { error: getStorageErrorMessage(error) },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isS3Configured()) return s3UnavailableResponse();

    const auth = await verifyDocumentsAuth(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Accès réservé à l'équipe." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = documentDeleteSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    await deleteDocument(parsed.data.key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/documents] DELETE", error);
    return NextResponse.json(
      { error: getStorageErrorMessage(error) },
      { status: 502 },
    );
  }
}
