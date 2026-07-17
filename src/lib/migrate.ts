import { readdir, readFile } from "fs/promises";
import path from "path";
import type { Pool } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

/**
 * Applique les fichiers SQL versionnés dans `migrations/` (0001_*.sql, …).
 * Idempotent : chaque version n’est enregistrée qu’une fois dans `schema_migrations`.
 */
export async function applySqlMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: appliedRows } = await pool.query<{ version: string }>(
    `SELECT version FROM schema_migrations`,
  );
  const applied = new Set(appliedRows.map((r) => r.version));

  let files: string[];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => /^\d{4}_.+\.sql$/i.test(f))
      .sort();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      console.warn(`[migrate] Dossier migrations introuvable: ${MIGRATIONS_DIR}`);
      return;
    }
    throw err;
  }

  for (const file of files) {
    const version = file.replace(/\.sql$/i, "");
    if (applied.has(version)) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [version]);
      await client.query("COMMIT");
      console.info(`[migrate] Applied ${version}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`[migrate] Failed ${version}`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
