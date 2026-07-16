import { extractEmailAddress } from "@/lib/mail/threading";

/**
 * Normalise une adresse pour le matching client/lead :
 * - extrait depuis "Nom <mail@x>"
 * - minuscules
 * - retire l’alias +tag (user+news@domain → user@domain)
 */
export function normalizeMatchEmail(raw: string): string | null {
  const email = extractEmailAddress(raw);
  if (!email.includes("@")) return null;
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain || !domain.includes(".")) return null;
  const baseLocal = local.split("+")[0]?.trim();
  if (!baseLocal) return null;
  return `${baseLocal}@${domain}`.toLowerCase();
}

/** Expression SQL Postgres : email sans +tag, lower+trim. */
export const SQL_NORMALIZE_EMAIL = `regexp_replace(LOWER(TRIM(email)), '\\+[^@]*@', '@')`;
