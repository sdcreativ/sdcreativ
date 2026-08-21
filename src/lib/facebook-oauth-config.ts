export function isMetaFacebookOAuthConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim(),
  );
}

export function getMetaGraphVersion(): string {
  const raw = process.env.META_GRAPH_VERSION?.trim() || "v21.0";
  return raw.startsWith("v") ? raw : `v${raw}`;
}

export function getMetaAppId(): string {
  const id = process.env.META_APP_ID?.trim();
  if (!id) throw new Error("META_APP_ID manquant.");
  return id;
}

export function getMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret) throw new Error("META_APP_SECRET manquant.");
  return secret;
}

export function getFacebookOAuthRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/admin/facebook/oauth/callback`;
}

export function getFacebookOAuthScopes(): string {
  return ["pages_show_list", "pages_manage_posts", "pages_read_engagement"].join(",");
}

export function getMetaGraphBaseUrl(): string {
  return `https://graph.facebook.com/${getMetaGraphVersion()}`;
}

export function buildFacebookAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: getFacebookOAuthRedirectUri(),
    state,
    scope: getFacebookOAuthScopes(),
    response_type: "code",
  });
  return `https://www.facebook.com/${getMetaGraphVersion()}/dialog/oauth?${params}`;
}
