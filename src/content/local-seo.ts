export type LocalSeoPage = {
  slug: string;
  path: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  sections: { heading: string; paragraphs: string[] }[];
  benefits: string[];
  faq: { question: string; answer: string }[];
};

export const localSeoPages: LocalSeoPage[] = [
  {
    slug: "agence-web-abidjan",
    path: "/agence-web-abidjan",
    metaTitle: "Agence web à Abidjan",
    metaDescription:
      "SD CREATIV, agence web à Abidjan : création de sites vitrines, e-commerce, SEO local et solutions digitales pour PME ivoiriennes. Devis gratuit.",
    eyebrow: "Abidjan · Côte d'Ivoire",
    title: "Votre agence web",
    highlight: "à Abidjan",
    description:
      "Basée à Abidjan, SD CREATIV accompagne les PME, entrepreneurs et organisations ivoiriennes dans leur transformation digitale avec des sites modernes, performants et orientés résultats.",
    sections: [
      {
        heading: "Une agence de proximité à Abidjan",
        paragraphs: [
          "Nous connaissons le marché ivoirien : Mobile Money, WhatsApp Business, SEO local à Abidjan et contraintes des PME. Chaque projet est adapté à votre réalité terrain.",
          "De Cocody au Plateau, de Treichville à Yopougon, nous intervenons sur tout le grand Abidjan et à distance dans toute la Côte d'Ivoire.",
        ],
      },
      {
        heading: "Nos services à Abidjan",
        paragraphs: [
          "Site vitrine, e-commerce, refonte web, agents IA, automatisation, applications mobiles et SEO local — une offre complète pour digitaliser votre activité sans complexité inutile.",
        ],
      },
    ],
    benefits: [
      "Équipe basée à Abidjan",
      "Devis gratuit en FCFA",
      "Paiement Mobile Money accepté",
      "Support WhatsApp réactif",
      "SEO local Abidjan",
      "Livraison 15–30 jours",
    ],
    faq: [
      {
        question: "Intervenez-vous uniquement à Abidjan ?",
        answer:
          "Nous sommes basés à Abidjan et privilégions un suivi de proximité. Nous accompagnons aussi des clients dans toute la Côte d'Ivoire et à l'international à distance.",
      },
      {
        question: "Combien coûte un site web à Abidjan ?",
        answer:
          "Nos formules démarrent à 350 000 FCFA HT pour un site vitrine. Utilisez notre configurateur de devis en ligne pour une estimation instantanée.",
      },
    ],
  },
  {
    slug: "creation-site-cote-ivoire",
    path: "/creation-site-cote-ivoire",
    metaTitle: "Création de site web en Côte d'Ivoire",
    metaDescription:
      "Création de site internet professionnel en Côte d'Ivoire : vitrine, e-commerce, mobile. Tarifs en FCFA, livraison rapide. SD CREATIV — devis gratuit.",
    eyebrow: "Côte d'Ivoire",
    title: "Création de site web",
    highlight: "en Côte d'Ivoire",
    description:
      "Vous cherchez une agence fiable pour créer votre site internet en Côte d'Ivoire ? SD CREATIV conçoit des sites professionnels adaptés au marché local et à vos objectifs business.",
    sections: [
      {
        heading: "Des sites pensés pour le marché ivoirien",
        paragraphs: [
          "Intégration WhatsApp, Orange Money, Wave, contenus en français, SEO local et design mobile-first : nos sites sont conçus pour convertir vos visiteurs ivoiriens en clients.",
          "Que vous soyez commerçant, restaurateur, cabinet professionnel ou startup, nous adaptons chaque projet à votre secteur et à votre budget.",
        ],
      },
      {
        heading: "Un processus simple et transparent",
        paragraphs: [
          "Audit gratuit, devis en FCFA, validation du design, développement, tests et mise en ligne — avec formation et support après livraison.",
        ],
      },
    ],
    benefits: [
      "Tarifs transparents en FCFA",
      "Sites 100 % responsive",
      "E-commerce Mobile Money",
      "Formation incluse",
      "Maintenance disponible",
      "Hébergement sécurisé",
    ],
    faq: [
      {
        question: "Quel délai pour créer un site en Côte d'Ivoire ?",
        answer:
          "Comptez entre 15 et 30 jours selon la complexité. Un calendrier précis est défini dès la validation du devis.",
      },
      {
        question: "Proposez-vous l'hébergement ?",
        answer:
          "Oui, nous gérons l'hébergement, le nom de domaine et la mise en production. Vous n'avez rien à gérer techniquement.",
      },
    ],
  },
];

export function getLocalSeoPage(slug: string) {
  return localSeoPages.find((p) => p.slug === slug);
}
