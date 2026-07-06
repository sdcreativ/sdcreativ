import { Accessibility, Award, Handshake, TrendingUp, type LucideIcon } from "lucide-react";

export type WhyUsItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const whyUsItems: WhyUsItem[] = [
  {
    icon: Accessibility,
    title: "Accessibilité",
    description:
      "Des solutions adaptées aux PME et entrepreneurs, avec des formules claires et un budget maîtrisé.",
  },
  {
    icon: Award,
    title: "Qualité professionnelle",
    description:
      "Des sites modernes, rapides et sécurisés, conçus avec les standards du web professionnel.",
  },
  {
    icon: Handshake,
    title: "Accompagnement",
    description:
      "Un suivi humain avant, pendant et après la mise en ligne pour garantir votre réussite.",
  },
  {
    icon: TrendingUp,
    title: "Performance",
    description:
      "Des expériences digitales pensées pour convertir vos visiteurs en clients.",
  },
];

export const whyUsIntro =
  "Chez SD CREATIV, nous ne livrons pas seulement un site web. Nous construisons avec vous un outil de croissance, pensé pour votre activité, votre audience et vos objectifs business.";
