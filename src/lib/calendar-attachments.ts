import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3PublicUrl } from "@/lib/blog-media";
import { downloadObjectBuffer, isS3Configured, sanitizeFilename } from "@/lib/s3";

export const MAX_CALENDAR_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Lien email : 7 jours (max typique IAM user pour URL signée). */
const CALENDAR_ATTACHMENT_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

export type CalendarEventAttachment = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  /** Clé S3 (`calendar/attachments/...`) ou chemin local (`/uploads/calendar/...`). */
  key?: string | null;
};

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const idx = base.lastIndexOf(".");
  return idx >= 0 ? base.slice(idx).toLowerCase() : "";
}

export function isAllowedCalendarAttachment(
  filename: string,
  contentType: string,
): boolean {
  const ext = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!contentType || contentType === "application/octet-stream") return true;
  return ALLOWED_MIME_TYPES.has(contentType);
}

export function buildCalendarAttachmentKey(filename: string): string {
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);
  return `calendar/attachments/${id}-${safeName}`;
}

async function uploadLocal(
  buffer: Buffer,
  filename: string,
): Promise<{ url: string; key: string }> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "calendar");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  const key = `/uploads/calendar/${unique}`;
  return { url: key, key };
}

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; key: string }> {
  const key = buildCalendarAttachmentKey(filename);
  const { S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${sanitizeFilename(filename)}"`,
      CacheControl: "private, max-age=0",
    }),
  );

  // URL « publique » stockée pour référence ; l’accès réel passe par URL signée / pièce jointe mail.
  return { url: getS3PublicUrl(key), key };
}

export async function uploadCalendarAttachment(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<CalendarEventAttachment> {
  if (buffer.length > MAX_CALENDAR_ATTACHMENT_BYTES) {
    throw new Error("Fichier trop volumineux (max 10 Mo).");
  }
  if (!isAllowedCalendarAttachment(filename, contentType)) {
    throw new Error(
      "Format non supporté. Formats acceptés : PDF, Word, Excel, images (JPEG, PNG, WebP, GIF).",
    );
  }

  const mimeType =
    contentType && contentType !== "application/octet-stream"
      ? contentType
      : mimeFromExtension(extensionOf(filename));

  const stored = isS3Configured()
    ? await uploadToS3(buffer, filename, mimeType)
    : await uploadLocal(buffer, filename);

  return {
    url: stored.url,
    key: stored.key,
    name: sanitizeFilename(filename),
    mimeType,
    size: buffer.length,
  };
}

function mimeFromExtension(ext: string): string {
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

/** Extrait la clé S3 depuis une URL bucket / CDN si `key` manquante (anciens events). */
export function extractCalendarAttachmentKey(
  attachment: Pick<CalendarEventAttachment, "url" | "key">,
): string | null {
  if (attachment.key?.trim()) {
    const k = attachment.key.trim();
    if (k.startsWith("calendar/attachments/") || k.startsWith("/uploads/calendar/")) {
      return k;
    }
  }

  const url = attachment.url?.trim() ?? "";
  if (!url) return null;
  if (url.startsWith("/uploads/calendar/")) return url;

  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const marker = "calendar/attachments/";
    const idx = pathname.indexOf(marker);
    if (idx >= 0) return pathname.slice(idx);
  } catch {
    /* ignore */
  }

  const marker = "calendar/attachments/";
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    return url.slice(idx).split("?")[0] ?? null;
  }
  return null;
}

export async function createCalendarAttachmentAccessUrl(
  attachment: CalendarEventAttachment,
): Promise<string | null> {
  const key = extractCalendarAttachmentKey(attachment);
  if (!key) return attachment.url || null;

  if (key.startsWith("/uploads/calendar/")) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    return base ? `${base}${key}` : key;
  }

  if (!isS3Configured()) return attachment.url || null;

  const { S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${sanitizeFilename(attachment.name)}"`,
    }),
    { expiresIn: CALENDAR_ATTACHMENT_LINK_TTL_SECONDS },
  );
}

export async function loadCalendarAttachmentBuffer(
  attachment: CalendarEventAttachment,
): Promise<Buffer | null> {
  const key = extractCalendarAttachmentKey(attachment);
  if (!key) return null;

  try {
    if (key.startsWith("/uploads/calendar/")) {
      const filePath = path.join(process.cwd(), "public", key.replace(/^\//, ""));
      return await readFile(filePath);
    }
    if (isS3Configured()) {
      return await downloadObjectBuffer(key);
    }
  } catch (error) {
    console.error("[calendar-attachments] lecture fichier impossible", { key, error });
  }
  return null;
}

export function parseCalendarAttachment(
  metadata: Record<string, unknown> | null,
): CalendarEventAttachment | null {
  const raw = metadata?.attachment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url.trim() : "";
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const mimeType = typeof obj.mimeType === "string" ? obj.mimeType.trim() : "";
  const size = typeof obj.size === "number" && Number.isFinite(obj.size) ? obj.size : 0;
  const key = typeof obj.key === "string" && obj.key.trim() ? obj.key.trim() : null;
  if (!url || !name) return null;
  return {
    url,
    name,
    mimeType: mimeType || "application/octet-stream",
    size,
    key,
  };
}
