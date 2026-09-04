import { whatsappUrl } from "@/lib/constants";

type ChatLocale = "fr" | "en";
type ChatLink = { label: string; href: string };

type ChatAction = {
  id: string;
  hrefFr: string;
  hrefEn: string;
  labelFr: string;
  labelEn: string;
  patterns: string[];
};

const ACTIONS: ChatAction[] = [
  {
    id: "devis",
    hrefFr: "/devis",
    hrefEn: "/en/devis",
    labelFr: "Devis en ligne",
    labelEn: "Online quote",
    patterns: ["devis", "formulaire en ligne", "estimation", "chiffr", "/devis"],
  },
  {
    id: "rdv",
    hrefFr: "/rendez-vous",
    hrefEn: "/en/book",
    labelFr: "Prendre rendez-vous",
    labelEn: "Book a call",
    patterns: [
      "rendez-vous",
      "rendez vous",
      "rdv",
      "prendre rendez",
      "book a call",
      "booking",
      "/rendez-vous",
      "/en/book",
    ],
  },
  {
    id: "contact",
    hrefFr: "/contact",
    hrefEn: "/en/contact",
    labelFr: "Contact",
    labelEn: "Contact",
    patterns: ["contact", "/contact", "formulaire de contact"],
  },
  {
    id: "tarifs",
    hrefFr: "/tarifs",
    hrefEn: "/en/pricing",
    labelFr: "Voir les tarifs",
    labelEn: "View pricing",
    patterns: ["tarif", "prix", "pricing", "/tarifs", "/en/pricing"],
  },
  {
    id: "ia",
    hrefFr: "/solutions-ia",
    hrefEn: "/en/solutions-ia",
    labelFr: "Solutions IA",
    labelEn: "AI solutions",
    patterns: ["solutions-ia", "agent ia", "agents ia", "solutions ia"],
  },
  {
    id: "maintenance",
    hrefFr: "/maintenance",
    hrefEn: "/en/maintenance",
    labelFr: "Maintenance",
    labelEn: "Maintenance",
    patterns: ["maintenance", "sla"],
  },
  {
    id: "whatsapp",
    hrefFr: whatsappUrl(),
    hrefEn: whatsappUrl("Hello SD CREATIV, I would like to talk."),
    labelFr: "WhatsApp",
    labelEn: "WhatsApp",
    patterns: ["whatsapp", "wa.me"],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function attachChatActionLinks(
  userMessage: string,
  answer: string,
  locale: ChatLocale = "fr",
): ChatLink[] {
  const haystack = normalize(`${userMessage}\n${answer}`);
  const links: ChatLink[] = [];

  for (const action of ACTIONS) {
    const hit = action.patterns.some((pattern) => haystack.includes(normalize(pattern)));
    if (!hit) continue;
    links.push({
      label: locale === "en" ? action.labelEn : action.labelFr,
      href: locale === "en" ? action.hrefEn : action.hrefFr,
    });
    if (links.length >= 3) break;
  }

  return links;
}

export function stripInternalChatPaths(text: string): string {
  return text
    .replace(
      /(?:dans la section|via les? (?:pages?|liens?)|sur les? pages?)\s+\/[^\s.,;]+(?:\s+ou\s+\/[^\s.,;]+)*/gi,
      "ci-dessous",
    )
    .replace(
      /(?:in the (?:section|page)|via the (?:page|pages|links?))\s+\/[^\s.,;]+(?:\s+or\s+\/[^\s.,;]+)*/gi,
      "below",
    )
    .replace(
      /\/(?:en\/)?(?:devis|contact|tarifs|rendez-vous|book|solutions-ia|maintenance|pricing|audit-gratuit)(?:\?[^\s.,;!]*)?/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;!?])/g, "$1")
    .replace(/([.,;!?]){2,}/g, "$1")
    .trim();
}
