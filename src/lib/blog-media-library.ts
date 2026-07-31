import { unlink } from "node:fs/promises";
import path from "node:path";
import { withDb } from "@/lib/db";
import { deleteDocument, isS3Configured } from "@/lib/s3";
import { parseS3ObjectFromPublicUrl } from "@/lib/image-url";

export type BlogMediaRecord = {
  id: string;
  url: string;
  filename: string;
  storage: "s3" | "local";
  byteSize: number | null;
  createdAt: string;
};

type BlogMediaRow = {
  id: string;
  url: string;
  filename: string;
  storage: string;
  byte_size: number | null;
  created_at: Date;
};

function mapRow(row: BlogMediaRow): BlogMediaRecord {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    storage: row.storage === "s3" ? "s3" : "local",
    byteSize: row.byte_size,
    createdAt: row.created_at.toISOString(),
  };
}

export async function registerBlogMedia(input: {
  url: string;
  filename: string;
  storage: "s3" | "local";
  byteSize?: number;
}): Promise<BlogMediaRecord> {
  return withDb(async (query) => {
    const { rows } = await query<BlogMediaRow>(
      `INSERT INTO blog_media (url, filename, storage, byte_size)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (url) DO UPDATE SET filename = EXCLUDED.filename
       RETURNING *`,
      [input.url, input.filename, input.storage, input.byteSize ?? null],
    );
    return mapRow(rows[0]!);
  });
}

export async function listBlogMedia(limit = 48): Promise<BlogMediaRecord[]> {
  return withDb(async (query) => {
    const { rows } = await query<BlogMediaRow>(
      `SELECT * FROM blog_media ORDER BY created_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map(mapRow);
  });
}

export async function getBlogMediaById(id: string): Promise<BlogMediaRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<BlogMediaRow>(
      `SELECT * FROM blog_media WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

async function deleteStoredFile(record: BlogMediaRecord): Promise<void> {
  if (record.storage === "s3" || /^https?:\/\//i.test(record.url)) {
    if (!isS3Configured()) return;
    const ref = parseS3ObjectFromPublicUrl(record.url);
    if (ref?.key) {
      await deleteDocument(ref.key);
      return;
    }
    // Fallback : extraire la clé blog/media/… depuis le pathname
    try {
      const pathname = new URL(record.url).pathname.replace(/^\//, "");
      const idx = pathname.indexOf("blog/media/");
      if (idx >= 0) {
        await deleteDocument(decodeURIComponent(pathname.slice(idx)));
      }
    } catch {
      /* ignore */
    }
    return;
  }

  if (record.url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", record.url.replace(/^\//, ""));
    await unlink(filePath).catch(() => undefined);
  }
}

/** Supprime l’entrée bibliothèque + le fichier (S3 ou local) au mieux. */
export async function deleteBlogMedia(id: string): Promise<boolean> {
  const record = await getBlogMediaById(id);
  if (!record) return false;

  try {
    await deleteStoredFile(record);
  } catch (error) {
    console.error("[blog-media] delete storage:", error);
  }

  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM blog_media WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
