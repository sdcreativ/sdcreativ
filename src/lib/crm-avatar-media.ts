import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isAllowedBlogImageType, getS3PublicUrl } from "@/lib/blog-media";
import { isS3Configured, sanitizeFilename } from "@/lib/s3";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function buildCrmAvatarKey(userId: string, filename: string): string {
  const safeName = sanitizeFilename(filename);
  return `crm/avatars/${userId}/${crypto.randomUUID()}-${safeName}`;
}

async function uploadCrmAvatarLocal(
  userId: string,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const unique = `${Date.now()}-${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", "crm-avatars", userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, unique), buffer);
  return `/uploads/crm-avatars/${userId}/${unique}`;
}

async function uploadCrmAvatarToS3(
  userId: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = buildCrmAvatarKey(userId, filename);
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

export async function uploadCrmAvatar(
  userId: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; storage: "s3" | "local" }> {
  if (!isAllowedBlogImageType(contentType)) {
    throw new Error("Format non supporté (JPEG, PNG, WebP, GIF).");
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new Error("Image trop volumineuse (max 2 Mo).");
  }

  if (isS3Configured()) {
    const url = await uploadCrmAvatarToS3(userId, buffer, filename, contentType);
    return { url, storage: "s3" };
  }

  return { url: await uploadCrmAvatarLocal(userId, buffer, filename), storage: "local" };
}
