/**
 * Phase 0 — décisions de cadrage 3CX (MVP SD CREATIV).
 * Consommé par les phases suivantes (widget, horaires, UX IA).
 *
 * Ne contient aucun secret. FQDN / tokens → variables d'environnement.
 */

/** Hébergement choisi pour le MVP. */
export const THREECX_HOSTING = "hosted" as const;
/** Alternative documentée si migration ultérieure. */
export type ThreeCxHosting = "hosted" | "self_hosted";

/**
 * Option UX retenue (Phase 0, raffinée Phase 7) :
 * A = 3CX en heures ouvrées (humain prioritaire) + Assistant IA en coexistence
 *     (handoff vers le chat conseiller). Hors horaires : IA + WhatsApp + RDV.
 * Détail : `src/lib/threecx/ai-coexistence.ts` · `docs/CRM-3CX-PHASE7.md`.
 */
export const THREECX_UX_MODE = "hours_split" as const;
export type ThreeCxUxMode = "hours_split" | "unified_bubble" | "commercial_pages_only";

export const THREECX_TIMEZONE = "Africa/Abidjan";

/** Aligné sur NEXT_PUBLIC_CONTACT_HOURS (Lun–Ven 8h–18h). */
export const THREECX_OPEN_HOURS = {
  /** 1 = lundi … 5 = vendredi (getDay() JS : 0 = dimanche). */
  weekdays: [1, 2, 3, 4, 5] as const,
  startHour: 8,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
} as const;

export const THREECX_OFFLINE_MESSAGE_FR =
  "Nos conseillers sont disponibles du lundi au vendredi, de 8h à 18h (Abidjan). " +
  "Laissez-nous un message, utilisez l’assistant IA, WhatsApp ou prenez rendez-vous en ligne — nous vous répondrons dès l’ouverture.";

export const THREECX_OFFLINE_MESSAGE_EN =
  "Our advisors are available Monday to Friday, 8am–6pm (Abidjan time). " +
  "Leave a message, use the AI assistant, WhatsApp, or book a call — we’ll get back to you when we open.";

export const THREECX_WELCOME_MESSAGE_FR =
  "Bonjour ! Bienvenue chez SD CREATIV. Comment pouvons-nous vous aider ? Chat ou appel audio — un conseiller vous répond.";

export const THREECX_WELCOME_MESSAGE_EN =
  "Hello! Welcome to SD CREATIV. How can we help? Chat or audio call — an advisor will reply.";

/** Plan de numérotation / files (à créer en Phase 1 dans la console 3CX). */
export const THREECX_QUEUES = [
  {
    id: "accueil-commercial",
    name: "Accueil commercial",
    extension: "800",
    purpose: "Live Chat + appels entrants site (devis, formations, projets)",
  },
  {
    id: "support-technique",
    name: "Support technique",
    extension: "801",
    purpose: "Clients maintenance / tickets (renvoi manuel ou IVR plus tard)",
  },
] as const;

/** Extensions agents de test (à provisionner Phase 1 — pas de secrets ici). */
export const THREECX_AGENT_SLOTS = [
  { label: "Agent commercial 1", suggestedExtension: "100", role: "commercial" },
  { label: "Agent commercial 2", suggestedExtension: "101", role: "commercial" },
  { label: "Direction / escalade", suggestedExtension: "102", role: "escalation" },
] as const;

/** Licences / capacités validées pour le cadrage MVP. */
export const THREECX_LICENSE_REQUIREMENTS = {
  edition: "Professional ou Enterprise (Hosted 3CX)",
  minAgentExtensions: 2,
  features: [
    "Live Chat (Website Link)",
    "Click-to-Call / appel audio navigateur (visiteurs)",
    "Web Client agents",
    "WebMeeting / visioconférence navigateur (équipe)",
    "CRM Integration (template serveur) — Phase 3–4",
  ],
  notes:
    "Le nombre exact de SCUs/extensions sera ajusté après inventaire des postes. " +
    "WebMeeting peut être inclus selon l’offre Hosted — à confirmer à la commande.",
} as const;

/** Pages prioritaires pour le widget (Phase 2). */
export const THREECX_PRIORITY_PATHS = [
  "/",
  "/services",
  "/formations",
  "/contact",
  "/devis",
  "/tarifs",
  "/rendez-vous",
] as const;

export type ThreeCxCadrageSummary = {
  hosting: typeof THREECX_HOSTING;
  uxMode: typeof THREECX_UX_MODE;
  timezone: typeof THREECX_TIMEZONE;
  openHoursLabel: string;
  offlineMessageFr: string;
  queues: typeof THREECX_QUEUES;
  license: typeof THREECX_LICENSE_REQUIREMENTS;
};

export const threecxCadrageSummary: ThreeCxCadrageSummary = {
  hosting: THREECX_HOSTING,
  uxMode: THREECX_UX_MODE,
  timezone: THREECX_TIMEZONE,
  openHoursLabel: "Lun – Ven : 8h – 18h (Africa/Abidjan)",
  offlineMessageFr: THREECX_OFFLINE_MESSAGE_FR,
  queues: THREECX_QUEUES,
  license: THREECX_LICENSE_REQUIREMENTS,
};

/**
 * Indique si l’instant donné tombe dans les heures d’ouverture 3CX (fuseau Abidjan).
 */
export function isThreeCxBusinessHours(date: Date = new Date()): boolean {
  const parts = getZonedParts(date, THREECX_TIMEZONE);
  if (!THREECX_OPEN_HOURS.weekdays.includes(parts.weekday as 1 | 2 | 3 | 4 | 5)) {
    return false;
  }
  const minutes = parts.hour * 60 + parts.minute;
  const start =
    THREECX_OPEN_HOURS.startHour * 60 + THREECX_OPEN_HOURS.startMinute;
  const end = THREECX_OPEN_HOURS.endHour * 60 + THREECX_OPEN_HOURS.endMinute;
  return minutes >= start && minutes < end;
}

/** Mode d’affichage widgets selon Option A (coexistence Phase 7). */
export function resolvePublicCommsMode(date: Date = new Date()): {
  showThreeCx: boolean;
  /** IA toujours proposée sur le site public (message contextualisé). */
  showAiAssistant: boolean;
  reason: "business_hours" | "after_hours";
} {
  const open = isThreeCxBusinessHours(date);
  if (THREECX_UX_MODE === "hours_split") {
    return {
      showThreeCx: open,
      showAiAssistant: true,
      reason: open ? "business_hours" : "after_hours",
    };
  }
  return { showThreeCx: true, showAiAssistant: true, reason: open ? "business_hours" : "after_hours" };
}

function getZonedParts(date: Date, timeZone: string): {
  weekday: number;
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[map.weekday ?? "Mon"] ?? 1,
    hour: Number(map.hour ?? 0),
    minute: Number(map.minute ?? 0),
  };
}
