/**
 * Phase 1 — socle PBX 3CX (config attendue + readiness env).
 * Aucun secret. Exécution console : docs/CRM-3CX-PHASE1.md
 */

import {
  THREECX_AGENT_SLOTS,
  THREECX_OFFLINE_MESSAGE_EN,
  THREECX_OFFLINE_MESSAGE_FR,
  THREECX_OPEN_HOURS,
  THREECX_QUEUES,
  THREECX_TIMEZONE,
  THREECX_WELCOME_MESSAGE_EN,
  THREECX_WELCOME_MESSAGE_FR,
} from "@/lib/threecx/cadrage";
import {
  getThreeCxRecordingNoticeEn,
  getThreeCxRecordingNoticeFr,
} from "@/lib/threecx/compliance";

/** Valeurs de base à coller dans Admin → Voice & chat → Live Chat → Messages. */
export const THREECX_WIDGET_COPY = {
  fr: {
    onlineGreeting: THREECX_WELCOME_MESSAGE_FR,
    offlineGreeting: THREECX_OFFLINE_MESSAGE_FR,
    introText: "Un conseiller SD CREATIV vous répond en direct.",
    startButton: "Démarrer la conversation",
  },
  en: {
    onlineGreeting: THREECX_WELCOME_MESSAGE_EN,
    offlineGreeting: THREECX_OFFLINE_MESSAGE_EN,
    introText: "A SD CREATIV advisor will reply in real time.",
    startButton: "Start conversation",
  },
} as const;

/**
 * Copy Live Chat avec mention d’enregistrement si
 * `NEXT_PUBLIC_THREE_CX_RECORDING_NOTICE=true` (Phase 8).
 */
export function getThreeCxWidgetCopyForConsole(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  const noticeFr = getThreeCxRecordingNoticeFr(env);
  const noticeEn = getThreeCxRecordingNoticeEn(env);
  return {
    fr: {
      onlineGreeting: noticeFr
        ? `${THREECX_WIDGET_COPY.fr.onlineGreeting} ${noticeFr}`
        : THREECX_WIDGET_COPY.fr.onlineGreeting,
      offlineGreeting: THREECX_WIDGET_COPY.fr.offlineGreeting,
      introText: THREECX_WIDGET_COPY.fr.introText,
      startButton: THREECX_WIDGET_COPY.fr.startButton,
    },
    en: {
      onlineGreeting: noticeEn
        ? `${THREECX_WIDGET_COPY.en.onlineGreeting} ${noticeEn}`
        : THREECX_WIDGET_COPY.en.onlineGreeting,
      offlineGreeting: THREECX_WIDGET_COPY.en.offlineGreeting,
      introText: THREECX_WIDGET_COPY.en.introText,
      startButton: THREECX_WIDGET_COPY.en.startButton,
    },
  };
}

/** Prefill formulaire visiteur (Live Chat General). */
export const THREECX_VISITOR_FIELDS = {
  requireName: true,
  requireEmail: true,
  requirePhone: false,
} as const;

/** Options Click-to-Call / WebRTC visiteurs. */
export const THREECX_CALL_OPTIONS = {
  allowVisitorAudioCall: true,
  allowCallWithoutChatFirst: true,
  videoForVisitors: false,
  note: "MVP : audio seul pour les visiteurs. Vidéo réservée WebMeeting agents.",
} as const;

/** Département / office hours à aligner sur le cadrage. */
export const THREECX_DEPARTMENT_HOURS = {
  timezone: THREECX_TIMEZONE,
  label: "Lun – Ven : 8h – 18h",
  weekdays: THREECX_OPEN_HOURS.weekdays,
  start: `${String(THREECX_OPEN_HOURS.startHour).padStart(2, "0")}:${String(THREECX_OPEN_HOURS.startMinute).padStart(2, "0")}`,
  end: `${String(THREECX_OPEN_HOURS.endHour).padStart(2, "0")}:${String(THREECX_OPEN_HOURS.endMinute).padStart(2, "0")}`,
} as const;

/**
 * Plan de numérotation à créer dans la console (queues + agents).
 * Destination Live Chat MVP = file Accueil commercial (800).
 */
export const THREECX_PBX_BLUEPRINT = {
  liveChatDestinationExtension: THREECX_QUEUES[0].extension,
  liveChatDestinationName: THREECX_QUEUES[0].name,
  queues: THREECX_QUEUES,
  agents: THREECX_AGENT_SLOTS,
  webMeeting: {
    enabled: true,
    purpose: "Réunions internes et clients (navigateur Web Client)",
    minAgents: 2,
  },
  websiteOriginsHint: [
    "https://sdcreativ.com",
    "https://www.sdcreativ.com",
    "http://localhost:3000",
  ],
} as const;

export type ThreeCxSocleCheckId =
  | "pbx_fqdn"
  | "live_chat_link"
  | "agents_min"
  | "console_tests";

export type ThreeCxSocleCheck = {
  id: ThreeCxSocleCheckId;
  label: string;
  ok: boolean;
  detail: string;
};

export type ThreeCxSocleReadiness = {
  ready: boolean;
  /** Prêt pour brancher le widget (Phase 2) sans encore l’activer. */
  readyForWidget: boolean;
  checks: ThreeCxSocleCheck[];
  missing: ThreeCxSocleCheckId[];
};

export type ThreeCxSocleEnv = {
  pbxFqdn?: string | null;
  liveChatLink?: string | null;
  /** Nombre d’agents confirmés opérationnels (saisie manuelle / ops). */
  confirmedAgents?: number | null;
  /** true quand les 3 tests console (chat, appel, meeting) sont OK. */
  consoleTestsPassed?: boolean | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function looksLikeFqdn(value: string): boolean {
  if (!value || value.includes("://") || value.includes("/")) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    value,
  );
}

function looksLikeLiveChatLink(value: string): boolean {
  if (!value) return false;
  // URL Website Link / Click2Talk / chemin fourni par 3CX
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith("callto:") || value.includes("3cx")) return true;
  // Identifiant opaque non vide (selon versions console)
  return value.length >= 8 && !/\s/.test(value);
}

/**
 * Évalue si le socle Phase 1 est suffisamment renseigné pour la Phase 2.
 * Les checks `agents_min` et `console_tests` restent manuels (ops).
 */
export function assessThreeCxSocleReadiness(
  env: ThreeCxSocleEnv = {},
): ThreeCxSocleReadiness {
  const fqdn = normalize(env.pbxFqdn);
  const link = normalize(env.liveChatLink);
  const agents = env.confirmedAgents ?? 0;
  const testsOk = env.consoleTestsPassed === true;

  const checks: ThreeCxSocleCheck[] = [
    {
      id: "pbx_fqdn",
      label: "FQDN PBX Hosted",
      ok: looksLikeFqdn(fqdn),
      detail: fqdn
        ? looksLikeFqdn(fqdn)
          ? fqdn
          : `Valeur invalide « ${fqdn} » (sans https://, ex. sdcreativ.3cx.fr)`
        : "THREE_CX_PBX_FQDN manquant",
    },
    {
      id: "live_chat_link",
      label: "Website Link Live Chat",
      ok: looksLikeLiveChatLink(link),
      detail: link
        ? looksLikeLiveChatLink(link)
          ? "Lien renseigné"
          : "Lien Live Chat invalide ou trop court"
        : "NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK manquant",
    },
    {
      id: "agents_min",
      label: "≥ 2 agents Web Client",
      ok: agents >= 2,
      detail:
        agents >= 2
          ? `${agents} agents confirmés`
          : "Confirmer ≥ 2 agents dans docs/CRM-3CX-ACCES.md puis THREE_CX_CONFIRMED_AGENTS",
    },
    {
      id: "console_tests",
      label: "Tests chat / appel / meeting",
      ok: testsOk,
      detail: testsOk
        ? "THREE_CX_CONSOLE_TESTS_PASSED=true"
        : "Passer les tests (Phase 1) puis THREE_CX_CONSOLE_TESTS_PASSED=true",
    },
  ];

  const missing = checks.filter((c) => !c.ok).map((c) => c.id);
  const readyForWidget =
    checks.find((c) => c.id === "pbx_fqdn")!.ok &&
    checks.find((c) => c.id === "live_chat_link")!.ok;

  return {
    ready: missing.length === 0,
    readyForWidget,
    checks,
    missing,
  };
}

/** Lit les variables d’environnement process (Node / Next serveur). */
export function assessThreeCxSocleFromProcessEnv(
  env: NodeJS.ProcessEnv = process.env,
): ThreeCxSocleReadiness {
  const agentsRaw = normalize(env.THREE_CX_CONFIRMED_AGENTS);
  const agents = agentsRaw ? Number(agentsRaw) : 0;
  const testsRaw = normalize(env.THREE_CX_CONSOLE_TESTS_PASSED).toLowerCase();

  return assessThreeCxSocleReadiness({
    pbxFqdn: env.THREE_CX_PBX_FQDN,
    liveChatLink: env.NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK,
    confirmedAgents: Number.isFinite(agents) ? agents : 0,
    consoleTestsPassed: testsRaw === "true" || testsRaw === "1",
  });
}
