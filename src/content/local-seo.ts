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
      "Devis personnalisé gratuit",
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
          "Chaque projet fait l'objet d'un devis personnalisé gratuit. Utilisez notre configurateur de devis en ligne pour décrire votre besoin.",
      },
    ],
  },
  {
    slug: "creation-site-cote-ivoire",
    path: "/creation-site-cote-ivoire",
    metaTitle: "Création de site web en Côte d'Ivoire",
    metaDescription:
      "Création de site internet professionnel en Côte d'Ivoire : vitrine, e-commerce, mobile. Livraison rapide. SD CREATIV — devis personnalisé gratuit.",
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
          "Audit gratuit, devis personnalisé, validation du design, développement, tests et mise en ligne — avec formation et support après livraison.",
        ],
      },
    ],
    benefits: [
      "Devis personnalisé gratuit",
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

export function getLocalSeoPage(slug: string, locale: "fr" | "en" = "fr") {
  const list = locale === "en" ? localSeoPagesEn : localSeoPages;
  return list.find((p) => p.slug === slug);
}

export const localSeoPagesEn: LocalSeoPage[] = [
  {
    slug: "agence-web-abidjan",
    path: "/en/web-agency-abidjan",
    metaTitle: "Web agency in Abidjan",
    metaDescription:
      "SD CREATIV, web agency in Abidjan: showcase sites, e-commerce, local SEO and digital solutions for Ivorian SMEs. Free custom quote.",
    eyebrow: "Abidjan · Côte d'Ivoire",
    title: "Your web agency",
    highlight: "in Abidjan",
    description:
      "Based in Abidjan, SD CREATIV helps Ivorian SMEs, entrepreneurs and organizations modernize with high-performing websites and result-driven digital solutions.",
    sections: [
      {
        heading: "A local agency in Abidjan",
        paragraphs: [
          "We know the Ivorian market: Mobile Money, WhatsApp Business, local SEO in Abidjan and SME constraints. Every project is adapted to your reality on the ground.",
          "From Cocody to Plateau, Treichville to Yopougon, we work across greater Abidjan and remotely throughout Côte d'Ivoire.",
        ],
      },
      {
        heading: "Our services in Abidjan",
        paragraphs: [
          "Showcase websites, e-commerce, redesigns, AI agents, automation, mobile apps and local SEO — a complete offer to digitize your business without unnecessary complexity.",
        ],
      },
    ],
    benefits: [
      "Team based in Abidjan",
      "Free custom quote",
      "Mobile Money payments accepted",
      "Responsive WhatsApp support",
      "Local SEO for Abidjan",
      "Delivery in 15–30 days",
    ],
    faq: [
      {
        question: "Do you only work in Abidjan?",
        answer:
          "We are based in Abidjan and prefer close follow-up. We also support clients across Côte d'Ivoire and internationally remotely.",
      },
      {
        question: "How much does a website cost in Abidjan?",
        answer:
          "Every project gets a free custom quote. Use our online quote configurator to describe your needs.",
      },
    ],
  },
  {
    slug: "creation-site-cote-ivoire",
    path: "/en/website-development-cote-divoire",
    metaTitle: "Website development in Côte d'Ivoire",
    metaDescription:
      "Professional website development in Côte d'Ivoire: showcase, e-commerce, mobile. Fast delivery. SD CREATIV — free custom quote.",
    eyebrow: "Côte d'Ivoire",
    title: "Website development",
    highlight: "in Côte d'Ivoire",
    description:
      "Looking for a reliable agency to build your website in Côte d'Ivoire? SD CREATIV designs professional sites adapted to the local market and your business goals.",
    sections: [
      {
        heading: "Sites built for the Ivorian market",
        paragraphs: [
          "WhatsApp integration, Orange Money, Wave, local SEO and mobile-first design: our sites are built to convert Ivorian visitors into customers.",
          "Whether you are a retailer, restaurant, professional firm or startup, we adapt every project to your sector and budget.",
        ],
      },
      {
        heading: "A simple, transparent process",
        paragraphs: [
          "Free audit, custom quote, design validation, development, testing and go-live — with training and support after launch.",
        ],
      },
    ],
    benefits: [
      "Free custom quote",
      "100% responsive sites",
      "Mobile Money e-commerce",
      "Training included",
      "Maintenance available",
      "Secure hosting",
    ],
    faq: [
      {
        question: "How long to build a website in Côte d'Ivoire?",
        answer:
          "Expect 15 to 30 days depending on complexity. A precise schedule is defined once the quote is validated.",
      },
      {
        question: "Do you provide hosting?",
        answer:
          "Yes — we manage hosting, domain name and production deployment. You do not have to handle the technical side.",
      },
    ],
  },
];

