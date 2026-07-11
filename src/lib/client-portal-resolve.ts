import { withDb } from "@/lib/db";
import { getClientByPortalId, getClientById, type Client } from "@/lib/clients";
import { hashPortalAccessToken } from "@/lib/client-portal-token";

async function getClientIdByPortalAccessTokenHash(tokenHash: string): Promise<string | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM clients WHERE portal_access_token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    return rows[0]?.id ?? null;
  });
}

async function getClientIdByPortalIdInsensitive(portalClientId: string): Promise<string | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM clients WHERE LOWER(portal_client_id) = LOWER($1) LIMIT 1`,
      [portalClientId],
    );
    return rows[0]?.id ?? null;
  });
}

async function getClientIdByPortalIdPrefix(loginId: string): Promise<string | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM clients
       WHERE portal_client_id = $1 OR portal_client_id LIKE $1 || '-%'
       ORDER BY LENGTH(portal_client_id) ASC
       LIMIT 1`,
      [loginId],
    );
    return rows[0]?.id ?? null;
  });
}

/** Identifiant saisi compatible avec le slug CRM (exact, casse, préfixe). */
export function loginIdMatchesPortalClient(loginId: string, portalClientId: string): boolean {
  const login = loginId.trim();
  const portal = portalClientId.trim();
  if (!login || !portal) return false;
  if (login === portal) return true;
  if (login.toLowerCase() === portal.toLowerCase()) return true;
  const loginLower = login.toLowerCase();
  const portalLower = portal.toLowerCase();
  if (portalLower.startsWith(`${loginLower}-`)) return true;
  if (loginLower.startsWith(`${portalLower}-`)) return true;
  return false;
}

export async function findClientByPortalAccessToken(token: string): Promise<Client | null> {
  const byTokenId = await getClientIdByPortalAccessTokenHash(hashPortalAccessToken(token));
  if (!byTokenId) return null;
  return getClientById(byTokenId);
}

/** Résout la fiche CRM à partir de l'identifiant de connexion (env, slug ou token). */
export async function resolveClientByPortalLoginId(
  loginPortalId: string,
  token?: string,
): Promise<Client | null> {
  const exact = await getClientByPortalId(loginPortalId);
  if (exact) return exact;

  const insensitiveId = await getClientIdByPortalIdInsensitive(loginPortalId);
  if (insensitiveId) return getClientById(insensitiveId);

  const prefixId = await getClientIdByPortalIdPrefix(loginPortalId);
  if (prefixId) return getClientById(prefixId);

  if (token) {
    const byTokenId = await getClientIdByPortalAccessTokenHash(hashPortalAccessToken(token));
    if (byTokenId) return getClientById(byTokenId);
  }

  return null;
}

export async function resolveCrmPortalClientId(
  loginPortalId: string,
  token?: string,
): Promise<string> {
  const client = await resolveClientByPortalLoginId(loginPortalId, token);
  return client?.portalClientId ?? loginPortalId;
}
