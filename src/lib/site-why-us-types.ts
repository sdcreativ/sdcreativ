import type { LucideIconName } from "@/lib/lucide-icon-map";

export type WhyUsItemStored = {
  icon: LucideIconName;
  title: string;
  description: string;
};

export type SiteWhyUsSettings = {
  eyebrow: string;
  title: string;
  highlight: string;
  intro: string;
  items: WhyUsItemStored[];
};

export const defaultSiteWhyUsSettings: SiteWhyUsSettings = {
  eyebrow: "Pourquoi choisir SD CREATIV ?",
  title: "Du marketing",
  highlight: "qui travaille pour vous.",
  intro:
    "Chez SD CREATIV, nous ne livrons pas seulement un site. Nous mettons en place des leviers concrets — présence en ligne, agents IA et automatisations — pour générer des leads, mieux répondre à vos clients et faire gagner du temps à vos équipes.",
  items: [
    {
      icon: "Accessibility",
      title: "Pensé pour les PME",
      description:
        "Des offres claires, un budget maîtrisé et des priorités business : visibilité, conversion et suivi commercial.",
    },
    {
      icon: "Award",
      title: "Résultats mesurables",
      description:
        "Sites qui convertissent, agents qui qualifient les demandes, campagnes et contenus orientés performance.",
    },
    {
      icon: "Handshake",
      title: "Accompagnement humain",
      description:
        "Un suivi avant, pendant et après : stratégie, déploiement, formation de vos équipes et ajustements.",
    },
    {
      icon: "TrendingUp",
      title: "Croissance continue",
      description:
        "SEO local, WhatsApp, CRM et agents IA pour transformer vos visiteurs en clients — et vos clients en fidèles.",
    },
  ],
};
