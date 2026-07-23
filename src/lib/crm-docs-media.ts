import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isS3Configured, sanitizeFilename, uploadObjectBuffer } from "@/lib/s3";
export { resolveCrmDocScreenshotSrc } from "@/lib/crm-docs-screenshot-url";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function isAllowedCrmDocImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function buildCrmDocMediaKey(filename: string): string {
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);
  return `crm-docs/media/${id}-${safeName}`;
}

export function getCrmDocS3PublicUrl(key: string): string {
  const base =
    process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? "eu-west-3";
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured.");
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadLocal(buffer: Buffer, filename: string): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "crm-docs");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  return `/uploads/crm-docs/${unique}`;
}

/**
 * Upload capture doc : S3 obligatoire si configuré (prod).
 * Stocke l’URL publique S3 ; l’UI la lit via `/api/media?url=…`.
 */
export async function uploadCrmDocImage(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; storage: "s3" | "local"; key?: string }> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image trop volumineuse (max 5 Mo).");
  }
  if (!isAllowedCrmDocImageType(contentType)) {
    throw new Error("Format non supporté (JPEG, PNG, WebP, GIF).");
  }

  if (isS3Configured()) {
    const key = buildCrmDocMediaKey(filename);
    await uploadObjectBuffer(key, buffer, contentType);
    const url = getCrmDocS3PublicUrl(key);
    return { url, storage: "s3", key };
  }

  // Dev local sans AWS uniquement
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Stockage S3 non configuré : impossible d’uploader une capture. Configurez AWS_S3_BUCKET et les clés AWS dans .env.docker.",
    );
  }

  const url = await uploadLocal(buffer, filename);
  return { url, storage: "local" };
}
