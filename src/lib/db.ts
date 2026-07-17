import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  return pool;
}

async function ensureSchema(): Promise<void> {
  const client = getPool();

  const { applySqlMigrations } = await import("@/lib/migrate");
  await applySqlMigrations(client);

  const { seedBlogCategories } = await import("@/lib/blog-categories");
  await seedBlogCategories(async (text, params) => {
    const result = await client.query(text, params);
    return { rows: result.rows as never[], rowCount: result.rowCount };
  });

  const { seedSystemCrmRoles } = await import("@/lib/crm-roles-db");
  await seedSystemCrmRoles(async (text, params) => {
    const result = await client.query(text, params);
    return { rows: result.rows as never[], rowCount: result.rowCount };
  });

  const { seedQuoteTemplates } = await import("@/lib/quote-templates");
  await seedQuoteTemplates(async (text, params) => {
    const result = await client.query(text, params);
    return { rows: result.rows as never[], rowCount: result.rowCount };
  });

  const { seedMarketingSequences } = await import("@/lib/marketing-sequences");
  await seedMarketingSequences(async (text, params) => {
    const result = await client.query(text, params);
    return { rows: result.rows as never[], rowCount: result.rowCount };
  });

  const { seedLegalEntities } = await import("@/lib/legal-entities");
  await seedLegalEntities(async (text, params) => {
    const result = await client.query(text, params);
    return { rows: result.rows as never[], rowCount: result.rowCount };
  });

  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const { rows: countRows } = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_users`,
    );
    if (Number(countRows[0]?.count ?? 0) === 0) {
      const { hashPassword } = await import("@/lib/crm-password");
      const passwordHash = await hashPassword(adminSecret);
      const email = (process.env.CRM_BOOTSTRAP_EMAIL ?? "admin@sdcreativ.com").toLowerCase();
      const name = process.env.CRM_BOOTSTRAP_NAME ?? "Administrateur SD CREATIV";
      await client.query(
        `INSERT INTO crm_users (email, password_hash, name, role, active, must_change_password)
         VALUES ($1, $2, $3, 'admin', true, true)
         ON CONFLICT (email) DO NOTHING`,
        [email, passwordHash, name],
      );
    }
  }
}

export async function withDb<T>(
  fn: (query: <R extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>) => Promise<T>,
): Promise<T> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!schemaReady) {
    schemaReady = ensureSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;

  const client = getPool();

  async function query<R extends QueryResultRow>(text: string, params?: unknown[]) {
    const result = await client.query<R>(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  return fn(query);
}

export async function withDbTransaction<T>(
  fn: (query: <R extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>) => Promise<T>,
): Promise<T> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!schemaReady) {
    schemaReady = ensureSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;

  const poolClient = await getPool().connect();
  try {
    await poolClient.query("BEGIN");

    async function query<R extends QueryResultRow>(text: string, params?: unknown[]) {
      const result = await poolClient.query<R>(text, params);
      return { rows: result.rows, rowCount: result.rowCount };
    }

    const result = await fn(query);
    await poolClient.query("COMMIT");
    return result;
  } catch (error) {
    await poolClient.query("ROLLBACK");
    throw error;
  } finally {
    poolClient.release();
  }
}
