import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGN_UPLOAD_TTL_SECONDS = 15 * 60;
const PRESIGN_DOWNLOAD_TTL_SECONDS = 15 * 60;

export const DOCUMENT_CATEGORIES = [
  "invoices",
  "contracts",
  "deliverables",
  "uploads",
  "misc",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type StoredDocument = {
  key: string;
  name: string;
  category: DocumentCategory;
  size: number;
  lastModified: string;
  projectId?: string;
};

let s3Client: S3Client | null = null;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET,
  );
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured.");
  return bucket;
}

function getClient(): S3Client {
  if (!isS3Configured()) {
    throw new Error("AWS S3 is not configured.");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  return s3Client;
}

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "document";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\-() ]+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return cleaned.slice(0, 120) || "document";
}

export function buildDocumentKey(
  clientId: string,
  category: DocumentCategory,
  filename: string,
): string {
  const safeClientId = clientId.replace(/[^a-zA-Z0-9_-]/g, "");
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);

  return `clients/${safeClientId}/${category}/${id}-${safeName}`;
}

export function buildProjectDocumentKey(
  clientId: string,
  projectId: string,
  category: DocumentCategory,
  filename: string,
): string {
  const safeClientId = clientId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);

  return `clients/${safeClientId}/projects/${safeProjectId}/${category}/${id}-${safeName}`;
}

export function buildTaskAttachmentKey(taskId: string, filename: string): string {
  const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, "");
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);
  return `crm/tasks/${safeTaskId}/${id}-${safeName}`;
}

function parseDocumentKey(key: string): StoredDocument | null {
  const parts = key.split("/");

  if (parts.length === 4 && parts[0] === "clients") {
    const category = parts[2] as DocumentCategory;
    if (!DOCUMENT_CATEGORIES.includes(category)) return null;
    const filePart = parts[3]!;
    const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
    const nameMatch = uuidPrefix.exec(filePart);
    const name = nameMatch ? filePart.slice(nameMatch[0].length) : filePart;
    return { key, name, category, size: 0, lastModified: "" };
  }

  if (parts.length === 6 && parts[0] === "clients" && parts[2] === "projects") {
    const category = parts[4] as DocumentCategory;
    if (!DOCUMENT_CATEGORIES.includes(category)) return null;
    const filePart = parts[5]!;
    const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
    const nameMatch = uuidPrefix.exec(filePart);
    const name = nameMatch ? filePart.slice(nameMatch[0].length) : filePart;
    return {
      key,
      name,
      category,
      size: 0,
      lastModified: "",
      projectId: parts[3],
    };
  }

  return null;
}

export async function listProjectDocuments(
  portalClientId: string,
  projectId: string,
  category?: DocumentCategory,
): Promise<StoredDocument[]> {
  const safeClient = portalClientId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  const prefix = category
    ? `clients/${safeClient}/projects/${safeProject}/${category}/`
    : `clients/${safeClient}/projects/${safeProject}/`;

  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: getBucket(),
      Prefix: prefix,
    }),
  );

  return (response.Contents ?? [])
    .map((item) => {
      if (!item.Key) return null;
      const parsed = parseDocumentKey(item.Key);
      if (!parsed) return null;
      return {
        ...parsed,
        size: item.Size ?? 0,
        lastModified: item.LastModified?.toISOString() ?? "",
      };
    })
    .filter((item): item is StoredDocument => item !== null)
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

export async function listClientDocuments(
  clientId: string,
  category?: DocumentCategory,
): Promise<StoredDocument[]> {
  const prefix = category
    ? `clients/${clientId.replace(/[^a-zA-Z0-9_-]/g, "")}/${category}/`
    : `clients/${clientId.replace(/[^a-zA-Z0-9_-]/g, "")}/`;

  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: getBucket(),
      Prefix: prefix,
    }),
  );

  return (response.Contents ?? [])
    .map((item) => {
      if (!item.Key) return null;
      const parsed = parseDocumentKey(item.Key);
      if (!parsed) return null;

      return {
        ...parsed,
        size: item.Size ?? 0,
        lastModified: item.LastModified?.toISOString() ?? "",
      };
    })
    .filter((item): item is StoredDocument => item !== null)
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; expiresIn: number }> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: PRESIGN_UPLOAD_TTL_SECONDS,
  });

  return { uploadUrl, expiresIn: PRESIGN_UPLOAD_TTL_SECONDS };
}

export async function createPresignedDownloadUrl(
  key: string,
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  const downloadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: PRESIGN_DOWNLOAD_TTL_SECONDS,
  });

  return { downloadUrl, expiresIn: PRESIGN_DOWNLOAD_TTL_SECONDS };
}

export async function deleteDocument(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

export function buildBillingDocumentKey(
  portalClientId: string,
  quoteId: string,
  kind: string,
  filename: string,
): string {
  const safeClient = portalClientId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeQuote = quoteId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeKind = kind.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeName = sanitizeFilename(filename);
  return `clients/${safeClient}/contracts/billing/${safeQuote}/${safeKind}-${crypto.randomUUID()}-${safeName}`;
}

export async function uploadObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
