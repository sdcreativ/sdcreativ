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
  title: "Bien plus",
  highlight: "qu'un site web.",
  intro:
    "Chez SD CREATIV, nous ne livrons pas seulement un site web. Nous construisons avec vous un outil de croissance, pensé pour votre activité, votre audience et vos objectifs business.",
  items: [
    {
      icon: "Accessibility",
      title: "Accessibilité",
      description:
        "Des solutions adaptées aux PME et entrepreneurs, avec des formules claires et un budget maîtrisé.",
    },
    {
      icon: "Award",
      title: "Qualité professionnelle",
      description:
        "Des sites modernes, rapides et sécurisés, conçus avec les standards du web professionnel.",
    },
    {
      icon: "Handshake",
      title: "Accompagnement",
      description:
        "Un suivi humain avant, pendant et après la mise en ligne pour garantir votre réussite.",
    },
    {
      icon: "TrendingUp",
      title: "Performance",
      description:
        "Des expériences digitales pensées pour convertir vos visiteurs en clients.",
    },
  ],
};
