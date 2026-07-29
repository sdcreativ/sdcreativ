/**
 * Zoom Server-to-Server OAuth (compte agence).
 * Marketplace Zoom → App type « Server-to-Server OAuth » → scopes meeting:write:admin
 * Runtime : `.env.docker` (restart conteneur `app`).
 */

export function isZoomApiConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID?.trim() &&
      process.env.ZOOM_CLIENT_ID?.trim() &&
      process.env.ZOOM_CLIENT_SECRET?.trim(),
  );
}

/** Utilisateur Zoom hôte (email ou userId Zoom). Défaut : `me` si non renseigné — S2S préfère un email. */
export function getZoomHostUserId(): string {
  const host =
    process.env.ZOOM_HOST_EMAIL?.trim() ||
    process.env.ZOOM_USER_ID?.trim() ||
    "me";
  return host;
}
