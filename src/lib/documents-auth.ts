import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/admin-auth";
import { ensureCrmRolesCache } from "@/lib/crm-roles-db";
import { roleHasPermission } from "@/lib/crm-permissions";
import type { CrmSessionPayload } from "@/lib/crm-session";
import {
  parseClientPortalTokens,
  validateClientCredentials as validateEnvCredentials,
} from "@/lib/client-portal-config";
import { validatePortalAccessCredentials } from "@/lib/client-portal-access";
import { resolveClientByPortalLoginId } from "@/lib/client-portal-resolve";

export const CLIENT_ID_COOKIE = "sdcreativ_client_id";
export const CLIENT_TOKEN_COOKIE = "sdcreativ_client_token";

export type ClientPortalSession = {
  /** Identifiant saisi à la connexion (cookies, documents S3). */
  loginClientId: string;
  /** Identifiant CRM canonique (devis, factures, projet). */
  crmPortalId: string;
};

export type DocumentPermission = "documents.read" | "documents.write";

export type DocumentAuth =
  | { role: "admin"; session: CrmSessionPayload }
  | { role: "client"; clientId: string };

export { parseClientPortalTokens };

export async function validateClientCredentials(
  clientId: string,
  token: string,
): Promise<boolean> {
  if (validateEnvCredentials(clientId, token)) {
    return true;
  }
  return validatePortalAccessCredentials(clientId, token);
}

type VerifyDocumentsAuthOptions = {
  adminPermission?: DocumentPermission;
};

export async function verifyDocumentsAuth(
  request: Request,
  options: VerifyDocumentsAuthOptions = {},
): Promise<DocumentAuth | null> {
  const adminPermission = options.adminPermission ?? "documents.read";

  const session = await getAdminSession();
  if (session) {
    if (session.mustChangePassword) return null;

    await ensureCrmRolesCache();
    if (roleHasPermission(session.role, adminPermission)) {
      return { role: "admin", session };
    }
    return null;
  }

  const clientIdHeader = request.headers.get("x-client-id");
  const clientTokenHeader = request.headers.get("x-client-token");
  if (clientIdHeader && clientTokenHeader) {
    if (await validateClientCredentials(clientIdHeader, clientTokenHeader)) {
      return { role: "client", clientId: clientIdHeader };
    }
  }

  const cookieStore = await cookies();
  const clientIdCookie = cookieStore.get(CLIENT_ID_COOKIE)?.value;
  const clientTokenCookie = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;
  if (clientIdCookie && clientTokenCookie) {
    if (await validateClientCredentials(clientIdCookie, clientTokenCookie)) {
      return { role: "client", clientId: clientIdCookie };
    }
  }

  return null;
}

export async function getClientSessionFromCookies(): Promise<ClientPortalSession | null> {
  const cookieStore = await cookies();
  const loginClientId = cookieStore.get(CLIENT_ID_COOKIE)?.value;
  const token = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;

  if (!loginClientId || !token) return null;
  if (!(await validateClientCredentials(loginClientId, token))) return null;

  const client = await resolveClientByPortalLoginId(loginClientId, token);
  const crmPortalId = client?.portalClientId ?? loginClientId;

  return { loginClientId, crmPortalId };
}

export function canAccessClient(auth: DocumentAuth, clientId: string): boolean {
  if (auth.role === "admin") return true;
  return auth.clientId === clientId;
}

export function extractClientIdFromKey(key: string): string | null {
  const match = /^clients\/([^/]+)\//.exec(key);
  return match?.[1] ?? null;
}

export function canAccessDocumentKey(auth: DocumentAuth, key: string): boolean {
  const ownerClientId = extractClientIdFromKey(key);
  if (!ownerClientId) return false;
  return canAccessClient(auth, ownerClientId);
}

export function isClientUploadCategory(category: string): boolean {
  return category === "uploads";
}
