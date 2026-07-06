export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  content: string[];
  contentHtml?: string;
  coverImage?: string;
  ogImage?: string;
  featuredOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "pourquoi-un-site-web-est-indispensable-pour-votre-pme",
    title: "Pourquoi un site web est indispensable pour votre PME",
    excerpt:
      "Découvrez comment un site professionnel renforce votre crédibilité et génère de nouvelles opportunités commerciales.",
    category: "Stratégie digitale",
    date: "2026-05-15",
    readTime: "5 min",
    content: [
      "Dans un monde où la première impression se joue en ligne, disposer d'un site web professionnel n'est plus un luxe — c'est une nécessité pour toute PME qui souhaite rester compétitive.",
      "Un site bien conçu inspire confiance, présente vos services 24h/24 et transforme vos visiteurs en prospects qualifiés. C'est votre vitrine permanente, accessible depuis n'importe quel appareil.",
      "Chez SD CREATIV, nous accompagnons les entrepreneurs ivoiriens dans la création de sites adaptés à leur budget et à leurs objectifs de croissance.",
    ],
  },
  {
    slug: "seo-local-comment-etre-visible-sur-google",
    title: "SEO local : comment être visible sur Google à Abidjan",
    excerpt:
      "Les bonnes pratiques pour apparaître dans les recherches locales et attirer des clients près de chez vous.",
    category: "SEO",
    date: "2026-04-22",
    readTime: "6 min",
    content: [
      "Le référencement local est essentiel pour les entreprises qui ciblent une clientèle de proximité. Optimiser votre fiche Google Business, structurer votre site et publier du contenu local sont des leviers puissants.",
      "Un site optimisé pour le SEO local combine une architecture technique solide, des mots-clés géolocalisés et une présence cohérente sur les annuaires locaux.",
      "Nous intégrons ces bonnes pratiques dès la conception de chaque projet SD CREATIV pour maximiser votre visibilité.",
    ],
  },
  {
    slug: "5-signes-que-votre-site-a-besoin-dune-refonte",
    title: "5 signes que votre site a besoin d'une refonte",
    excerpt:
      "Design dépassé, lenteur, mauvaise expérience mobile… Identifiez les signaux qui indiquent qu'il est temps de moderniser.",
    category: "Refonte web",
    date: "2026-03-10",
    readTime: "4 min",
    content: [
      "Un site vieillissant nuit à votre image de marque et à vos conversions. Si votre site met plus de 3 secondes à charger, n'est pas adapté au mobile ou ne reflète plus votre activité actuelle, une refonte s'impose.",
      "La refonte web est l'occasion de repenser l'expérience utilisateur, d'améliorer les performances et d'intégrer de nouvelles fonctionnalités.",
      "SD CREATIV propose un diagnostic gratuit pour évaluer l'état de votre site et définir un plan de modernisation sur mesure.",
    ],
  },
  {
    slug: "comment-choisir-agence-web-abidjan",
    title: "Comment choisir une agence web à Abidjan ?",
    excerpt:
      "Les critères essentiels pour sélectionner le bon partenaire digital en Côte d'Ivoire : portfolio, tarifs FCFA, support local et délais.",
    category: "Conseils",
    date: "2026-06-01",
    readTime: "6 min",
    content: [
      "Choisir une agence web à Abidjan est une décision stratégique. Au-delà du prix, vérifiez le portfolio local, la compréhension du marché ivoirien (Mobile Money, WhatsApp) et la qualité du support après livraison.",
      "Demandez toujours un devis détaillé en FCFA, les délais de livraison et les garanties incluses. Une agence sérieuse propose un audit gratuit et reste transparente sur les coûts.",
      "SD CREATIV accompagne les PME ivoiriennes avec des tarifs clairs, un configurateur de devis en ligne et une équipe basée à Abidjan.",
    ],
  },
  {
    slug: "e-commerce-mobile-money-cote-ivoire",
    title: "E-commerce et Mobile Money en Côte d'Ivoire",
    excerpt:
      "Orange Money, Wave, MTN MoMo : intégrer les paiements mobiles dans votre boutique en ligne pour convertir vos clients ivoiriens.",
    category: "E-commerce",
    date: "2026-05-28",
    readTime: "7 min",
    content: [
      "Le e-commerce en Côte d'Ivoire passe par le Mobile Money. Orange Money et Wave représentent la majorité des paiements en ligne pour les PME locales.",
      "Une boutique bien configurée combine catalogue produits, paiement Mobile Money, notifications WhatsApp et livraison locale à Abidjan et en province.",
      "SD CREATIV intègre nativement ces moyens de paiement dans vos projets e-commerce, avec formation à l'administration incluse.",
    ],
  },
  {
    slug: "agents-ia-pme-cote-ivoire",
    title: "Agents IA pour les PME en Côte d'Ivoire",
    excerpt:
      "Chatbots, assistants WhatsApp et automatisation : comment l'intelligence artificielle peut aider votre PME à gagner du temps.",
    category: "Intelligence artificielle",
    date: "2026-06-15",
    readTime: "5 min",
    content: [
      "L'intelligence artificielle n'est plus réservée aux grandes entreprises. Les PME ivoiriennes peuvent déployer des agents IA pour répondre aux clients, qualifier des leads et automatiser des tâches répétitives.",
      "Un chatbot connecté à WhatsApp ou à votre site web peut traiter 80 % des questions fréquentes, 24h/24, sans embaucher de personnel supplémentaire.",
      "SD CREATIV conçoit et déploie des agents IA sur mesure, adaptés au contexte local et à votre budget en FCFA.",
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
