import { cookies } from "next/headers";
import {
  parseClientPortalTokens,
  validateClientCredentials as validateClientPortalCredentials,
} from "@/lib/client-portal-config";

const ADMIN_COOKIE = "sdcreativ_admin";
export const CLIENT_ID_COOKIE = "sdcreativ_client_id";
export const CLIENT_TOKEN_COOKIE = "sdcreativ_client_token";

export type DocumentAuth =
  | { role: "admin" }
  | { role: "client"; clientId: string };

export { parseClientPortalTokens };

export function validateClientCredentials(
  clientId: string,
  token: string,
): boolean {
  return validateClientPortalCredentials(clientId, token);
}

export async function verifyDocumentsAuth(
  request: Request,
): Promise<DocumentAuth | null> {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminHeader = request.headers.get("x-admin-secret");

  if (adminSecret && adminHeader === adminSecret) {
    return { role: "admin" };
  }

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE)?.value;
  if (adminSecret && adminCookie === adminSecret) {
    return { role: "admin" };
  }

  const clientIdHeader = request.headers.get("x-client-id");
  const clientTokenHeader = request.headers.get("x-client-token");
  if (clientIdHeader && clientTokenHeader) {
    if (validateClientCredentials(clientIdHeader, clientTokenHeader)) {
      return { role: "client", clientId: clientIdHeader };
    }
  }

  const clientIdCookie = cookieStore.get(CLIENT_ID_COOKIE)?.value;
  const clientTokenCookie = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;
  if (clientIdCookie && clientTokenCookie) {
    if (validateClientCredentials(clientIdCookie, clientTokenCookie)) {
      return { role: "client", clientId: clientIdCookie };
    }
  }

  return null;
}

export async function getClientSessionFromCookies(): Promise<{ clientId: string } | null> {
  const cookieStore = await cookies();
  const clientId = cookieStore.get(CLIENT_ID_COOKIE)?.value;
  const token = cookieStore.get(CLIENT_TOKEN_COOKIE)?.value;

  if (!clientId || !token) return null;
  if (!validateClientCredentials(clientId, token)) return null;

  return { clientId };
}

export function canAccessClient(auth: DocumentAuth, clientId: string): boolean {
  if (auth.role === "admin") return true;
  return auth.clientId === clientId;
}

export function extractClientIdFromKey(key: string): string | null {
  const match = /^clients\/([^/]+)\//.exec(key);
  return match?.[1] ?? null;
}

export function isClientUploadCategory(category: string): boolean {
  return category === "uploads";
}
