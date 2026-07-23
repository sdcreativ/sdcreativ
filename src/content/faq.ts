export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "Combien coûte un site web ?",
    answer:
      "Nous proposons trois formules (Essentiel, Professionnel, Business) adaptées à chaque étape. Le tarif dépend du nombre de pages, des fonctionnalités et du niveau d'accompagnement. Contactez-nous pour un devis personnalisé gratuit.",
  },
  {
    question: "Le site sera-t-il adapté aux mobiles ?",
    answer:
      "Oui, tous nos sites sont 100 % responsive. Ils s'adaptent parfaitement aux smartphones, tablettes et ordinateurs pour une expérience optimale sur chaque appareil.",
  },
  {
    question: "Combien de temps faut-il pour créer un site ?",
    answer:
      "En moyenne, comptez entre 15 et 30 jours selon la complexité du projet. Nous définissons un calendrier précis dès la validation du devis.",
  },
  {
    question: "Proposez-vous la maintenance après livraison ?",
    answer:
      "Absolument. Nous proposons 3 formules maintenance (Essentiel, Professionnel, Premium SLA) — sauvegardes, mises à jour, monitoring et assistance technique. Voir /maintenance pour le détail et demander un devis.",
  },
  {
    question: "Puis-je modifier mon site moi-même ?",
    answer:
      "Oui, nous pouvons intégrer un système de gestion de contenu (CMS) pour que vous puissiez mettre à jour textes, images et articles de blog en autonomie.",
  },
  {
    question: "Travaillez-vous avec des entreprises en Côte d'Ivoire ?",
    answer:
      "Oui, nous sommes basés à Abidjan et accompagnons les PME et entrepreneurs ivoiriens avec un suivi de proximité. Nous intervenons également à l'international (Afrique de l'Ouest, Europe) pour des projets à distance.",
  },
];

/** Fallback FAQ for the English public site when no CMS EN entries exist. */
export const faqItemsEn: FaqItem[] = [
  {
    question: "How much does a website cost?",
    answer:
      "We offer three packages (Essentiel, Professionnel, Business) tailored to each stage. Pricing depends on pages, features and support level. Contact us for a free custom quote.",
  },
  {
    question: "Will the site be mobile-friendly?",
    answer:
      "Yes — every site we deliver is fully responsive across smartphones, tablets and desktops.",
  },
  {
    question: "How long does a project take?",
    answer:
      "Typically 15 to 30 days depending on complexity. We agree on a clear timeline when the quote is approved.",
  },
  {
    question: "Do you offer maintenance after launch?",
    answer:
      "Yes. We provide three maintenance plans (Essentiel, Professionnel, Premium SLA) with backups, updates, monitoring and technical support. See /en/maintenance for details.",
  },
  {
    question: "Can I update the site myself?",
    answer:
      "Yes — we can set up a CMS so you can edit texts, images and blog posts on your own.",
  },
  {
    question: "Do you work with companies in Côte d'Ivoire?",
    answer:
      "Yes. We are based in Abidjan and support Ivorian SMEs closely. We also deliver remote projects across West Africa and Europe.",
  },
];
