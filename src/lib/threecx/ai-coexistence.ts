/**
 * Phase 7 — coexistence Assistant IA ↔ Live Chat 3CX (règle produit).
 *
 * Qui s’affiche quand (Option A raffinée) :
 * - Heures ouvrées (Lun–Ven 8h–18h Abidjan) + pages prioritaires + 3CX activé
 *   → widget 3CX (humain) + Assistant IA avec message de handoff
 * - Hors horaires (ou 3CX indisponible)
 *   → Assistant IA + WhatsApp + prise de RDV (/rendez-vous)
 * - Admin / espace client / présentation tablette → aucun widget public
 */

import { whatsappUrl } from "@/lib/constants";
import {
  isThreeCxBusinessHours,
  THREECX_OPEN_HOURS,
  THREECX_TIMEZONE,
} from "@/lib/threecx/cadrage";
import { getThreeCxRecordingNoticeFr } from "@/lib/threecx/compliance";

export const OPEN_THREECX_CHAT_EVENT = "sdcreativ:open-threecx-chat";

export type AiCommsMode = "handoff" | "after_hours" | "default";

export const THREECX_AI_PRODUCT_RULE = {
  id: "hours_split_coexistence",
  summaryFr:
    "En heures ouvrées, un conseiller 3CX est prioritaire ; l’IA oriente vers le chat humain. " +
    "Hors horaires, l’IA reste disponible avec WhatsApp et prise de rendez-vous.",
  businessHoursLabel: "Lun – Ven : 8h – 18h (Africa/Abidjan)",
  timezone: THREECX_TIMEZONE,
  openHours: THREECX_OPEN_HOURS,
  handoff: {
    when: "business_hours_and_threecx_active",
    aiRole: "Répondre aux FAQ et proposer d’ouvrir le Live Chat / appel 3CX",
    humanRole: "Qualification commerciale, devis, appels audio",
  },
  afterHours: {
    when: "outside_business_hours_or_threecx_unavailable",
    aiRole: "Orienter, répondre FAQ, proposer RDV et WhatsApp",
    humanRole: "Reprise au prochain créneau d’ouverture (file 3CX / CRM)",
  },
} as const;

/** Quand l’équipe humaine doit reprendre un fil IA. */
export const THREECX_AI_HANDOFF_PLAYBOOK = [
  "Le visiteur demande un devis personnalisé, un prix ferme ou un engagement de délais.",
  "Le visiteur veut parler à un humain, appeler, ou négocier.",
  "Sujet support client existant (maintenance, incident) → ticket / file 801.",
  "L’IA a répondu 2 fois « je ne sais pas » / fallback sur le même sujet.",
  "Demande hors périmètre (juridique, litige, données personnelles sensibles).",
] as const;

export function resolveAiCommsMode(opts: {
  date?: Date;
  threeCxActive: boolean;
}): AiCommsMode {
  const open = isThreeCxBusinessHours(opts.date ?? new Date());
  if (open && opts.threeCxActive) return "handoff";
  if (!open) return "after_hours";
  return "default";
}

export function getAiGreeting(mode: AiCommsMode): {
  content: string;
  links: Array<{ label: string; href: string }>;
  /** CTA qui ouvre le widget 3CX (mode handoff). */
  openThreeCxLabel?: string;
} {
  const recording = getThreeCxRecordingNoticeFr();

  if (mode === "handoff") {
    return {
      content:
        "Bonjour ! Un conseiller SD CREATIV est disponible maintenant. " +
        "Vous pouvez ouvrir le chat (ou un appel audio) avec l’équipe, " +
        "ou me poser une question rapide sur nos services et tarifs." +
        (recording ? ` ${recording}` : ""),
      links: [
        { label: "Solutions IA", href: "/solutions-ia" },
        { label: "Devis en ligne", href: "/devis" },
      ],
      openThreeCxLabel: "Ouvrir le chat conseiller",
    };
  }

  if (mode === "after_hours") {
    return {
      content:
        "Bonjour ! Nos conseillers sont joignables en Live Chat du lundi au vendredi, 8h–18h (Abidjan). " +
        "En attendant, je peux vous orienter — ou prenez rendez-vous / écrivez-nous sur WhatsApp.",
      links: [
        { label: "Prendre rendez-vous", href: "/rendez-vous" },
        { label: "WhatsApp", href: whatsappUrl("Bonjour SD CREATIV, je souhaite échanger.") },
        { label: "Devis en ligne", href: "/devis" },
      ],
    };
  }

  return {
    content:
      "Bonjour ! Je suis l’assistant SD CREATIV. Posez-moi vos questions sur nos services, tarifs ou délais. " +
      "Pour parler à un conseiller, utilisez le chat en bas à droite sur les pages contact / devis (heures ouvrées), WhatsApp ou la prise de RDV.",
    links: [
      { label: "Prendre rendez-vous", href: "/rendez-vous" },
      { label: "Contact", href: "/contact" },
      { label: "Devis en ligne", href: "/devis" },
    ],
  };
}

/** Demande l’ouverture du Live Chat 3CX (écouteur dans ThreeCxWidget). */
export function requestOpenThreeCxChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_THREECX_CHAT_EVENT));
  const el = document.querySelector<HTMLElement>(
    "[data-threecx-widget], call-us-selector",
  );
  el?.click();
}
