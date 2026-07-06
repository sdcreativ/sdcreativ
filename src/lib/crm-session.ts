import type { CrmRole } from "@/content/crm-roles";

export const ADMIN_SESSION_COOKIE = "sdcreativ_admin_session";
export const LEGACY_ADMIN_COOKIE = "sdcreativ_admin";

export type CrmSessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: CrmRole;
  exp: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacSha256Base64Url(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function signCrmSession(payload: CrmSessionPayload, secret: string): Promise<string> {
  const data = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256Base64Url(secret, data);
  return `${data}.${sig}`;
}

export async function verifyCrmSession(
  token: string,
  secret: string,
): Promise<CrmSessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256Base64Url(secret, data);
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    const payload = JSON.parse(base64UrlDecodeToString(data)) as CrmSessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function buildCrmSessionCookie(
  payload: Omit<CrmSessionPayload, "exp">,
  secret: string,
  maxAgeSeconds = 60 * 60 * 8,
): Promise<{ value: string; maxAge: number }> {
  const exp = Date.now() + maxAgeSeconds * 1000;
  return {
    value: await signCrmSession({ ...payload, exp }, secret),
    maxAge: maxAgeSeconds,
  };
}
