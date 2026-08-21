import { withDb, isDatabaseConfigured } from "@/lib/db";
import { SITE } from "@/lib/constants";
import { isS3ImageUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import {
  getFacebookOAuthRedirectUri,
  getMetaAppId,
  getMetaAppSecret,
  getMetaGraphBaseUrl,
  isMetaFacebookOAuthConfigured,
} from "@/lib/facebook-oauth-config";
import { decryptMetaSecret, encryptMetaSecret } from "@/lib/facebook-token-crypto";

export type FacebookPageSummary = {
  id: string;
  name: string;
};

export type FacebookPageConnectionPublic = {
  connected: boolean;
  configured: boolean;
  pageId: string | null;
  pageName: string | null;
  connectedAt: string | null;
  availablePages: FacebookPageSummary[];
};

type ConnectionRow = {
  id: string;
  page_id: string;
  page_name: string;
  page_access_token_enc: string;
  user_token_enc: string | null;
  token_expires_at: Date | null;
  available_pages: unknown;
  connected_by: string | null;
  connected_at: Date;
  updated_at: Date;
};

type GraphPage = {
  id: string;
  name: string;
  access_token: string;
};

function parseAvailablePages(raw: unknown): FacebookPageSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { id?: unknown; name?: unknown };
      if (typeof row.id !== "string" || typeof row.name !== "string") return null;
      return { id: row.id, name: row.name };
    })
    .filter((item): item is FacebookPageSummary => Boolean(item));
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${getMetaGraphBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json()) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Erreur Graph API (${res.status}).`);
  }
  return json;
}

async function graphPostForm<T>(
  path: string,
  accessToken: string,
  body: Record<string, string>,
): Promise<T> {
  const url = new URL(`${getMetaGraphBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  const form = new URLSearchParams({ ...body, access_token: accessToken });
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Erreur Graph API (${res.status}).`);
  }
  return json;
}

export async function exchangeFacebookCode(code: string): Promise<{
  accessToken: string;
  expiresIn: number | null;
}> {
  const url = new URL(`${getMetaGraphBaseUrl()}/oauth/access_token`);
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("client_secret", getMetaAppSecret());
  url.searchParams.set("redirect_uri", getFacebookOAuthRedirectUri());
  url.searchParams.set("code", code);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message || "Échange du code OAuth Facebook impossible.");
  }
  return {
    accessToken: json.access_token,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : null,
  };
}

export async function exchangeLongLivedUserToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number | null;
}> {
  const url = new URL(`${getMetaGraphBaseUrl()}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", getMetaAppId());
  url.searchParams.set("client_secret", getMetaAppSecret());
  url.searchParams.set("fb_exchange_token", shortLivedToken);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message || "Impossible d’obtenir un token long-lived.");
  }
  return {
    accessToken: json.access_token,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : null,
  };
}

export async function listFacebookPagesForUser(userToken: string): Promise<GraphPage[]> {
  const json = await graphGet<{ data?: GraphPage[] }>("/me/accounts", userToken, {
    fields: "id,name,access_token",
  });
  return (json.data ?? []).filter((p) => p.id && p.name && p.access_token);
}

/** Extrait un indice de page depuis NEXT_PUBLIC_SOCIAL_FACEBOOK (slug ou id numérique). */
export function guessPreferredFacebookPageId(
  pages: FacebookPageSummary[],
  socialUrl = process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "",
): string | null {
  if (pages.length === 0) return null;
  if (pages.length === 1) return pages[0]!.id;

  const raw = socialUrl.trim();
  if (!raw) return null;
  try {
    const pathname = new URL(raw.startsWith("http") ? raw : `https://${raw}`).pathname
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean)
      .pop()
      ?.toLowerCase();
    if (!pathname) return null;
    if (/^\d+$/.test(pathname)) {
      return pages.find((p) => p.id === pathname)?.id ?? null;
    }
    const byName = pages.find(
      (p) =>
        p.name.toLowerCase().replace(/\s+/g, "") === pathname ||
        p.name.toLowerCase().includes(pathname),
    );
    return byName?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveFacebookPageConnection(input: {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  userAccessToken: string | null;
  tokenExpiresAt: Date | null;
  availablePages: FacebookPageSummary[];
  connectedBy: string | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("Base de données non configurée.");
  }
  const pageEnc = encryptMetaSecret(input.pageAccessToken);
  const userEnc = input.userAccessToken ? encryptMetaSecret(input.userAccessToken) : null;

  await withDb(async (query) => {
    await query(`DELETE FROM facebook_page_connection`);
    await query(
      `INSERT INTO facebook_page_connection (
        page_id, page_name, page_access_token_enc, user_token_enc,
        token_expires_at, available_pages, connected_by, connected_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,NOW(),NOW())`,
      [
        input.pageId,
        input.pageName,
        pageEnc,
        userEnc,
        input.tokenExpiresAt,
        JSON.stringify(input.availablePages),
        input.connectedBy,
      ],
    );
  });
}

export async function deleteFacebookPageConnection(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await withDb(async (query) => {
    await query(`DELETE FROM facebook_page_connection`);
  });
}

async function getConnectionRow(): Promise<ConnectionRow | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<ConnectionRow>(
      `SELECT * FROM facebook_page_connection ORDER BY connected_at DESC LIMIT 1`,
    );
    return rows[0] ?? null;
  });
}

export async function getFacebookPageConnectionStatus(): Promise<FacebookPageConnectionPublic> {
  const configured = isMetaFacebookOAuthConfigured();
  const row = await getConnectionRow();
  if (!row) {
    return {
      connected: false,
      configured,
      pageId: null,
      pageName: null,
      connectedAt: null,
      availablePages: [],
    };
  }
  return {
    connected: true,
    configured,
    pageId: row.page_id,
    pageName: row.page_name,
    connectedAt: row.connected_at.toISOString(),
    availablePages: parseAvailablePages(row.available_pages),
  };
}

export async function getDecryptedPageAccessToken(): Promise<{
  pageId: string;
  pageName: string;
  accessToken: string;
} | null> {
  const row = await getConnectionRow();
  if (!row) return null;
  return {
    pageId: row.page_id,
    pageName: row.page_name,
    accessToken: decryptMetaSecret(row.page_access_token_enc),
  };
}

export async function selectFacebookPage(pageId: string): Promise<FacebookPageConnectionPublic> {
  const row = await getConnectionRow();
  if (!row?.user_token_enc) {
    throw new Error("Reconnectez Facebook pour changer de Page.");
  }
  const userToken = decryptMetaSecret(row.user_token_enc);
  const pages = await listFacebookPagesForUser(userToken);
  const target = pages.find((p) => p.id === pageId);
  if (!target) {
    throw new Error("Page introuvable sur ce compte Facebook.");
  }
  await saveFacebookPageConnection({
    pageId: target.id,
    pageName: target.name,
    pageAccessToken: target.access_token,
    userAccessToken: userToken,
    tokenExpiresAt: row.token_expires_at,
    availablePages: pages.map((p) => ({ id: p.id, name: p.name })),
    connectedBy: row.connected_by,
  });
  return getFacebookPageConnectionStatus();
}

/** URL publique absolue pour que le crawler Facebook puisse récupérer l’image. */
export function toAbsolutePublicMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const base = SITE.url.replace(/\/$/, "");
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${base}${trimmed}`;
  }
  if (isS3ImageUrl(trimmed)) {
    return `${base}${resolveImageDisplayUrl(trimmed)}`;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

export function buildBlogPublicUrl(slug: string): string {
  return `${SITE.url.replace(/\/$/, "")}/blog/${slug}`;
}

export async function publishToFacebookPage(input: {
  message: string;
  linkUrl: string;
  imageUrl: string | null;
}): Promise<{ postId: string; permalink: string | null }> {
  const conn = await getDecryptedPageAccessToken();
  if (!conn) {
    throw new Error("Aucune Page Facebook connectée.");
  }

  const message = input.message.trim();
  if (!message) {
    throw new Error("Le message de publication est requis.");
  }

  if (input.imageUrl) {
    const photo = await graphPostForm<{ id?: string; post_id?: string }>(
      `/${conn.pageId}/photos`,
      conn.accessToken,
      {
        url: input.imageUrl,
        caption: message,
        published: "true",
      },
    );
    const postId = photo.post_id || photo.id;
    if (!postId) {
      throw new Error("Publication photo Facebook sans identifiant de retour.");
    }
    return {
      postId,
      permalink: `https://www.facebook.com/${postId}`,
    };
  }

  const feed = await graphPostForm<{ id?: string }>(`/${conn.pageId}/feed`, conn.accessToken, {
    message,
    link: input.linkUrl,
  });
  if (!feed.id) {
    throw new Error("Publication Facebook sans identifiant de retour.");
  }
  return {
    postId: feed.id,
    permalink: `https://www.facebook.com/${feed.id}`,
  };
}
