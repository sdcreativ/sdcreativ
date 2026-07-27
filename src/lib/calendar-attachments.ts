import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3PublicUrl } from "@/lib/blog-media";
import { isS3Configured, sanitizeFilename } from "@/lib/s3";

export const MAX_CALENDAR_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

async function uploadLocal(buffer: Buffer, filename: string): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "calendar");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  return `/uploads/calendar/${unique}`;
}

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
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
      CacheControl: "private, max-age=0",
    }),
  );

  return getS3PublicUrl(key);
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

  const url = isS3Configured()
    ? await uploadToS3(buffer, filename, mimeType)
    : await uploadLocal(buffer, filename);

  return {
    url,
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
  if (!url || !name) return null;
  return { url, name, mimeType: mimeType || "application/octet-stream", size };
}
