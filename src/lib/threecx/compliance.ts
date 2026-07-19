/**
 * Phase 8 — conformité RGPD / mentions légales 3CX (constantes ops + code).
 */

/** Durée max de conservation des journaux CRM (`communication_events`) — alignée privacy. */
export const THREECX_CRM_JOURNAL_RETENTION_YEARS = 3;

/**
 * Checklist RGPD (à valider ops / juridique).
 * Détail procédural : `docs/CRM-3CX-PHASE8.md`.
 */
export const THREECX_RGPD_CHECKLIST = [
  {
    id: "finalites",
    label: "Finalités documentées (relation commerciale, support, journalisation)",
    codeRef: "privacy-policy.ts · finalites",
  },
  {
    id: "bases",
    label: "Bases légales (mesures précontractuelles + intérêt légitime journal)",
    codeRef: "privacy-policy.ts · base-legale",
  },
  {
    id: "conservation",
    label: `Conservation journaux CRM ≤ ${THREECX_CRM_JOURNAL_RETENTION_YEARS} ans après dernier échange`,
    codeRef: "privacy-policy.ts · conservation",
  },
  {
    id: "dpa_3cx",
    label: "DPA / clauses sous-traitance 3CX (hébergeur Hosted) signées ou acceptées",
    codeRef: "ops — console / contrat 3CX",
  },
  {
    id: "recording",
    label: "Si enregistrement activé : mention claire + NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE=true",
    codeRef: "compliance.ts · getThreeCxRecordingNotice*",
  },
  {
    id: "secrets",
    label: "THREE_CX_CRM_TOKEN uniquement serveur (.env.docker / secrets CI), jamais NEXT_PUBLIC_*",
    codeRef: ".env.example · assertThreeCxServerSecrets",
  },
  {
    id: "minimisation",
    label: "Logs API sans contenu chat / numéro complet en clair",
    codeRef: "auth.ts · logThreeCxRequest",
  },
] as const;

export const THREECX_RECORDING_NOTICE_FR =
  "Cette conversation ou cet appel peut être enregistré à des fins de qualité et de formation, conformément à notre politique de confidentialité.";

export const THREECX_RECORDING_NOTICE_EN =
  "This conversation or call may be recorded for quality and training purposes, in accordance with our privacy policy.";

function envFlag(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** True si l’enregistrement est activé côté PBX et doit être annoncé. */
export function isThreeCxRecordingNoticeEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return envFlag(env.NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE);
}

export function getThreeCxRecordingNoticeFr(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  return isThreeCxRecordingNoticeEnabled(env) ? THREECX_RECORDING_NOTICE_FR : null;
}

export function getThreeCxRecordingNoticeEn(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  return isThreeCxRecordingNoticeEnabled(env) ? THREECX_RECORDING_NOTICE_EN : null;
}

/**
 * Vérifie qu’aucun secret serveur 3CX n’est exposé via NEXT_PUBLIC_*.
 * Retourne la liste des clés problématiques (vide = OK).
 */
export function assertThreeCxServerSecrets(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string[] {
  const problems: string[] = [];
  const token = env.THREE_CX_CRM_TOKEN?.trim();
  if (env.NEXT_PUBLIC_THREE_CX_CRM_TOKEN?.trim()) {
    problems.push("NEXT_PUBLIC_THREE_CX_CRM_TOKEN");
  }
  if (token) {
    for (const [key, value] of Object.entries(env)) {
      if (!key.startsWith("NEXT_PUBLIC_")) continue;
      if (typeof value === "string" && value.trim() === token) {
        problems.push(key);
      }
    }
  }
  return [...new Set(problems)];
}
