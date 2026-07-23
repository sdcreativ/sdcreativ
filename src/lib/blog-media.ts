import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedUploadUrl, isS3Configured, sanitizeFilename } from "@/lib/s3";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function isAllowedBlogImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function buildBlogMediaKey(filename: string): string {
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);
  return `blog/media/${id}-${safeName}`;
}

export function getS3PublicUrl(key: string): string {
  const base = process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? "eu-west-3";
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured.");
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadBlogImageLocal(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "blog");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  return `/uploads/blog/${unique}`;
}

export async function uploadBlogImageToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = buildBlogMediaKey(filename);
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

export async function uploadBlogImage(
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
    const url = await uploadBlogImageToS3(buffer, filename, contentType);
    const { registerBlogMedia } = await import("@/lib/blog-media-library");
    await registerBlogMedia({
      url,
      filename,
      storage: "s3",
      byteSize: buffer.length,
    });
    return { url, storage: "s3" };
  }

  const url = await uploadBlogImageLocal(buffer, filename);
  const { registerBlogMedia } = await import("@/lib/blog-media-library");
  await registerBlogMedia({
    url,
    filename,
    storage: "local",
    byteSize: buffer.length,
  });
  return { url, storage: "local" };
}

export async function createBlogImagePresignedUpload(
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }> {
  if (!isS3Configured()) {
    throw new Error("S3 non configuré — utilisez l'upload direct.");
  }
  if (!isAllowedBlogImageType(contentType)) {
    throw new Error("Format non supporté.");
  }

  const key = buildBlogMediaKey(filename);
  const { uploadUrl, expiresIn } = await createPresignedUploadUrl(key, contentType);

  return {
    uploadUrl,
    publicUrl: getS3PublicUrl(key),
    key,
    expiresIn,
  };
}

export { MAX_IMAGE_BYTES };
