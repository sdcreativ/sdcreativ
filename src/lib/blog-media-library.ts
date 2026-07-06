import { withDb } from "@/lib/db";

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
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map(mapRow);
  });
}
