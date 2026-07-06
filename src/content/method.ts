import {
  Ear,
  Search,
  Lightbulb,
  PenTool,
  Code2,
  Rocket,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export type MethodStep = {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export const methodSteps: MethodStep[] = [
  {
    number: "01",
    icon: Ear,
    title: "Écouter",
    description: "Comprendre votre activité, vos objectifs et vos attentes.",
  },
  {
    number: "02",
    icon: Search,
    title: "Diagnostiquer",
    description: "Analyser votre présence actuelle et identifier les leviers de croissance.",
  },
  {
    number: "03",
    icon: Lightbulb,
    title: "Proposer",
    description: "Définir la solution adaptée avec un devis clair et transparent.",
  },
  {
    number: "04",
    icon: PenTool,
    title: "Concevoir",
    description: "Créer maquettes et identité visuelle alignées à votre marque.",
  },
  {
    number: "05",
    icon: Code2,
    title: "Développer",
    description: "Construire un site performant, responsive et optimisé SEO.",
  },
  {
    number: "06",
    icon: Rocket,
    title: "Lancer",
    description: "Mettre en ligne, tester et former votre équipe.",
  },
  {
    number: "07",
    icon: LineChart,
    title: "Suivre",
    description: "Assurer maintenance, évolutions et amélioration continue.",
  },
];
