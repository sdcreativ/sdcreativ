import { NextResponse } from "next/server";
import {
  canAccessClient,
  extractClientIdFromKey,
  verifyDocumentsAuth,
} from "@/lib/documents-auth";
import { createPresignedDownloadUrl, isS3Configured } from "@/lib/s3";
import { getStorageErrorMessage } from "@/lib/s3-errors";
import { documentDownloadQuerySchema } from "@/lib/validations/documents";

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

    const auth = await verifyDocumentsAuth(request, { adminPermission: "documents.read" });
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const parsed = documentDownloadQuerySchema.safeParse({
      key: searchParams.get("key"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Paramètres invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { key } = parsed.data;
    const ownerClientId = extractClientIdFromKey(key);

    if (!ownerClientId || !canAccessClient(auth, ownerClientId)) {
      return unauthorizedResponse();
    }

    const { downloadUrl, expiresIn } = await createPresignedDownloadUrl(key);

    return NextResponse.json({ downloadUrl, expiresIn });
  } catch (error) {
    console.error("[api/documents/download] GET", error);
    return NextResponse.json(
      { error: getStorageErrorMessage(error) },
      { status: 502 },
    );
  }
}
