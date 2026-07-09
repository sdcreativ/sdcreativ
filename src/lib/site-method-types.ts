import type { LucideIconName } from "@/lib/lucide-icon-map";

export type MethodStepStored = {
  number: string;
  icon: LucideIconName;
  title: string;
  description: string;
};

export type SiteMethodSettings = {
  eyebrow: string;
  title: string;
  highlight: string;
  steps: MethodStepStored[];
};

export const defaultSiteMethodSettings: SiteMethodSettings = {
  eyebrow: "Notre méthode fluide",
  title: "Une méthode simple",
  highlight: "en 7 étapes",
  steps: [
    {
      number: "01",
      icon: "Ear",
      title: "Écouter",
      description: "Comprendre votre activité, vos objectifs et vos attentes.",
    },
    {
      number: "02",
      icon: "Search",
      title: "Diagnostiquer",
      description: "Analyser votre présence actuelle et identifier les leviers de croissance.",
    },
    {
      number: "03",
      icon: "Lightbulb",
      title: "Proposer",
      description: "Définir la solution adaptée avec un devis clair et transparent.",
    },
    {
      number: "04",
      icon: "PenTool",
      title: "Concevoir",
      description: "Créer maquettes et identité visuelle alignées à votre marque.",
    },
    {
      number: "05",
      icon: "Code2",
      title: "Développer",
      description: "Construire un site performant, responsive et optimisé SEO.",
    },
    {
      number: "06",
      icon: "Rocket",
      title: "Lancer",
      description: "Mettre en ligne, tester et former votre équipe.",
    },
    {
      number: "07",
      icon: "LineChart",
      title: "Suivre",
      description: "Assurer maintenance, évolutions et amélioration continue.",
    },
  ],
};
