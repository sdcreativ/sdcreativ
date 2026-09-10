export type HouseProduct = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
  secondaryHref?: string;
  secondaryCta?: string;
  featured?: boolean;
};

export const houseProducts: HouseProduct[] = [
  {
    id: "kodiva",
    name: "KODIVA",
    category: "Agents IA",
    tagline: "Des agents qui qualifient, répondent et agissent.",
    description:
      "La plateforme d’agents IA de SD CREATIV. Vous créez l’agent, on l’installe sur votre site ou WhatsApp. Sans code côté visiteur : widget, modèle, connaissances, test, puis publication.",
    points: [
      "12 types d’agents : accueil, commercial, support, RDV, e-commerce, RH…",
      "Base documentaire et FAQ, sans développer",
      "Leads, conversations et intégrations dans un même espace",
      "Self-service ou installation accompagnée par l’agence",
    ],
    href: "https://kodiva.sdcreativ.com/",
    cta: "Ouvrir KODIVA",
    secondaryHref: "/solutions-ia",
    secondaryCta: "Voir les cas d’usage",
    featured: true,
  },
  {
    id: "caddynote",
    name: "CaddyNote",
    category: "Gestion scolaire",
    tagline: "La gestion scolaire, simplifiée.",
    description:
      "CaddyNote connecte directions, enseignants et familles : présences, notes, paiements Mobile Money, documents et pilotage multi-établissements.",
    points: [
      "Espaces direction, enseignants et familles",
      "Présences, notes et documents au même endroit",
      "Paiements Mobile Money",
      "Pilotage d’un ou plusieurs établissements",
    ],
    href: "https://caddynote.com/",
    cta: "Ouvrir CaddyNote",
  },
];

export const houseProductsEn: HouseProduct[] = [
  {
    id: "kodiva",
    name: "KODIVA",
    category: "AI agents",
    tagline: "Agents that qualify, reply and take action.",
    description:
      "SD CREATIV’s AI-agent platform. You create the agent, we install it on your site or WhatsApp. No code for visitors: widget, model, knowledge, test, then go live.",
    points: [
      "12 agent types: reception, sales, support, bookings, e-commerce, HR…",
      "Knowledge base and FAQ, no development required",
      "Leads, conversations and integrations in one workspace",
      "Self-serve or agency-assisted setup",
    ],
    href: "https://kodiva.sdcreativ.com/",
    cta: "Open KODIVA",
    secondaryHref: "/en/solutions-ia",
    secondaryCta: "See use cases",
    featured: true,
  },
  {
    id: "caddynote",
    name: "CaddyNote",
    category: "School management",
    tagline: "School operations, simplified.",
    description:
      "CaddyNote connects leadership, teachers and families: attendance, grades, Mobile Money payments, documents and multi-school management.",
    points: [
      "Spaces for leadership, teachers and families",
      "Attendance, grades and documents in one place",
      "Mobile Money payments",
      "Run one school or several",
    ],
    href: "https://caddynote.com/",
    cta: "Open CaddyNote",
  },
];
