import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3PublicUrl, isAllowedBlogImageType, MAX_IMAGE_BYTES } from "@/lib/blog-media";
import { isS3Configured, sanitizeFilename } from "@/lib/s3";

export function buildSiteMediaKey(filename: string): string {
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);
  return `site/media/${id}-${safeName}`;
}

async function uploadSiteMediaLocal(buffer: Buffer, filename: string): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "site-media");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  return `/uploads/site-media/${unique}`;
}

async function uploadSiteMediaToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = buildSiteMediaKey(filename);
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
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return getS3PublicUrl(key);
}

/** Upload image site (heroes, services, réalisations…) → S3 ou local. */
export async function uploadSiteMedia(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; storage: "s3" | "local" }> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image trop volumineuse (max 5 Mo).");
  }
  if (!isAllowedBlogImageType(contentType)) {
    throw new Error("Format non supporté (JPEG, PNG, WebP, GIF).");
  }

  if (isS3Configured()) {
    return { url: await uploadSiteMediaToS3(buffer, filename, contentType), storage: "s3" };
  }

  return { url: await uploadSiteMediaLocal(buffer, filename), storage: "local" };
}
