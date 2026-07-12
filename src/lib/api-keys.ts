import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { withDb } from "@/lib/db";
import type { ApiKeyScope } from "@/content/priority3-labels";
import { API_KEY_SCOPES } from "@/content/priority3-labels";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatedApiKey = ApiKeyRecord & { plainKey: string };

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(120),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
});

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      last_used_at: Date | null;
      revoked_at: Date | null;
      created_at: Date;
    }>(`SELECT id, name, key_prefix, scopes, last_used_at, revoked_at, created_at
        FROM api_keys ORDER BY created_at DESC`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      keyPrefix: r.key_prefix,
      scopes: r.scopes as ApiKeyScope[],
      lastUsedAt: r.last_used_at?.toISOString() ?? null,
      revokedAt: r.revoked_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
    }));
  });
}

export async function createApiKey(
  input: z.infer<typeof createApiKeySchema>,
  createdBy?: string,
): Promise<CreatedApiKey> {
  const plainKey = `sk_${randomBytes(24).toString("hex")}`;
  const keyPrefix = plainKey.slice(0, 12);
  const keyHash = hashKey(plainKey);

  return withDb(async (query) => {
    const { rows } = await query<{ id: string; created_at: Date }>(
      `INSERT INTO api_keys (name, key_prefix, key_hash, scopes, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [input.name, keyPrefix, keyHash, input.scopes, createdBy ?? null],
    );
    return {
      id: rows[0]!.id,
      name: input.name,
      keyPrefix,
      scopes: input.scopes,
      plainKey,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: rows[0]!.created_at.toISOString(),
    };
  });
}

export async function revokeApiKey(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  });
}

export type VerifiedApiKey = {
  id: string;
  scopes: ApiKeyScope[];
};

export async function verifyApiKeyFromRequest(
  request: Request,
): Promise<VerifiedApiKey | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer sk_")) return null;
  const plainKey = auth.slice(7).trim();
  if (!plainKey.startsWith("sk_")) return null;

  const keyHash = hashKey(plainKey);
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; scopes: string[] }>(
      `SELECT id, scopes FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL`,
      [keyHash],
    );
    const row = rows[0];
    if (!row) return null;
    await query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [row.id]);
    return { id: row.id, scopes: row.scopes as ApiKeyScope[] };
  });
}

export function apiKeyHasScope(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  return scopes.includes(required);
}
