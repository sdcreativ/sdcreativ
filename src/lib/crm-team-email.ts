/** Domaine des emails professionnels CRM (boîtes Hostinger). */
export function getCrmTeamEmailDomain(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_CRM_TEAM_EMAIL_DOMAIN?.trim() ||
    process.env.CRM_TEAM_EMAIL_DOMAIN?.trim();
  return (fromEnv || "sdcreativ.com").toLowerCase();
}

export const HOSTINGER_EMAIL_PANEL_URL = "https://hpanel.hostinger.com/emails";

/** Partie locale Hostinger : lettres, chiffres, points (pas de points consécutifs). */
export const CRM_TEAM_EMAIL_LOCAL_PART_RE = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/i;

export function normalizeTeamEmailLocalPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function buildTeamEmail(localPart: string, domain = getCrmTeamEmailDomain()): string {
  const local = normalizeTeamEmailLocalPart(localPart);
  return `${local}@${domain}`;
}

export function isCrmTeamEmail(email: string, domain = getCrmTeamEmailDomain()): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  const local = normalized.slice(0, at);
  const host = normalized.slice(at + 1);
  if (host !== domain) return false;
  if (local.length < 1 || local.length > 50) return false;
  return CRM_TEAM_EMAIL_LOCAL_PART_RE.test(local);
}

export function teamEmailValidationMessage(domain = getCrmTeamEmailDomain()): string {
  return `Utilisez une adresse @${domain} (créez d'abord la boîte dans Hostinger Email).`;
}
