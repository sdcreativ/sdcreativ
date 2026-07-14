import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getS3PublicUrl } from "@/lib/blog-media";
import { isS3Configured, sanitizeFilename } from "@/lib/s3";

const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function isAllowedSiteLogoType(contentType: string): boolean {
  return ALLOWED_LOGO_TYPES.has(contentType);
}

export function buildSiteLogoKey(filename: string): string {
  const safeName = sanitizeFilename(filename);
  return `site/logo/${crypto.randomUUID()}-${safeName}`;
}

async function uploadSiteLogoLocal(buffer: Buffer, filename: string): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "site-logo");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  return `/uploads/site-logo/${unique}`;
}

async function uploadSiteLogoToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = buildSiteLogoKey(filename);
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
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return getS3PublicUrl(key);
}

export async function uploadSiteLogo(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; storage: "s3" | "local" }> {
  if (!isAllowedSiteLogoType(contentType)) {
    throw new Error("Format non supporté (JPEG, PNG, WebP, GIF, SVG).");
  }
  if (buffer.length > MAX_LOGO_BYTES) {
    throw new Error("Logo trop volumineux (max 2 Mo).");
  }

  if (isS3Configured()) {
    const url = await uploadSiteLogoToS3(buffer, filename, contentType);
    return { url, storage: "s3" };
  }

  return { url: await uploadSiteLogoLocal(buffer, filename), storage: "local" };
}
