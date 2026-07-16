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

const EMAIL_TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function normalizeTeamEmailLocalPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** Retire accents / diacritiques (é → e). */
function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Base lisible depuis le nom complet : `prenom.nom`.
 * Ex. « Marie Koné » → `marie.kone` ; « Jean-Pierre Dupont » → `jeanpierre.dupont`.
 */
export function suggestTeamEmailLocalPartFromName(fullName: string): string {
  const parts = stripDiacritics(fullName)
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 40);

  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${first}.${last}`.slice(0, 40);
}

/** Suffixe aléatoire court (ex. `k7m2`). */
export function randomTeamEmailToken(length = 4): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => EMAIL_TOKEN_ALPHABET[b % EMAIL_TOKEN_ALPHABET.length]!).join(
    "",
  );
}

function takenEmailSet(existingEmails: Iterable<string>): Set<string> {
  return new Set(
    [...existingEmails].map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
}

export function isTeamEmailTaken(
  email: string,
  existingEmails: Iterable<string>,
): boolean {
  return takenEmailSet(existingEmails).has(email.trim().toLowerCase());
}

/**
 * Alloue une partie locale unique : `base.token` (token aléatoire).
 * Réessaie tant que l'email existe déjà dans la liste fournie.
 */
export function allocateUniqueTeamEmailLocalPart(
  baseFromName: string,
  existingEmails: Iterable<string>,
  domain = getCrmTeamEmailDomain(),
  options?: { tokenLength?: number; maxAttempts?: number },
): string {
  const tokenLength = options?.tokenLength ?? 4;
  const maxAttempts = options?.maxAttempts ?? 48;
  const taken = takenEmailSet(existingEmails);
  const base = (baseFromName || "membre").slice(0, 40);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = randomTeamEmailToken(tokenLength);
    const local = `${base}.${token}`.slice(0, 50);
    if (!CRM_TEAM_EMAIL_LOCAL_PART_RE.test(local)) continue;
    const email = `${local}@${domain}`;
    if (!taken.has(email)) return local;
  }

  throw new Error("Impossible de générer un email professionnel unique. Réessayez.");
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
