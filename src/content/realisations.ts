export type RealisationTestimonial = {
  quote: string;
  author: string;
  role: string;
};

export type RealisationCaseStudy = {
  challenge: string;
  solution: string;
  results: string[];
};

export type RealisationBeforeAfter = {
  beforeLabel: string;
  afterLabel: string;
};

export type Realisation = {
  id: string;
  title: string;
  client: string;
  sector: string;
  location: string;
  year: string;
  duration: string;
  category: string;
  description: string;
  tags: string[];
  stack: string[];
  image: string;
  imageAlt: string;
  accent: string;
  metric?: { value: string; label: string };
  featured?: boolean;
  caseStudy: RealisationCaseStudy;
  testimonial?: RealisationTestimonial;
  beforeAfter?: RealisationBeforeAfter;
};

export const realisationCategories = [
  "Tous",
  "E-commerce",
  "Site vitrine",
  "Refonte web",
  "SEO Local",
] as const;

export const realisations: Realisation[] = [
  {
    id: "boutique-mode",
    title: "Maison Koba Mode",
    client: "Maison Koba",
    sector: "Mode & accessoires",
    location: "Bruxelles, Belgique",
    year: "2025",
    duration: "20 jours",
    category: "E-commerce",
    description:
      "Boutique en ligne pour une créatrice belge : catalogue de 45 articles, paiement sécurisé (Bancontact & carte), livraison en Belgique et commandes via WhatsApp.",
    tags: ["E-commerce", "Paiement en ligne", "WhatsApp"],
    stack: ["WordPress", "WooCommerce", "Mollie", "Stripe"],
    image: "/images/realisations/boutique-mode.png",
    imageAlt: "Site e-commerce Maison Koba Mode — Bruxelles, Belgique",
    accent: "#0072B5",
    metric: { value: "+40%", label: "Commandes en ligne" },
    featured: true,
    caseStudy: {
      challenge:
        "Ventes uniquement via Instagram et pop-up stores à Bruxelles. Pas de catalogue en ligne ni de paiement sécurisé pour les clientes en province.",
      solution:
        "Boutique responsive avec filtres par catégorie, paiement en ligne, notifications automatiques et gestion des stocks simplifiée.",
      results: [
        "+40 % de commandes en ligne en 2 mois",
        "45 articles catalogués en autonomie",
        "Livraison couvrant Bruxelles et la Belgique",
      ],
    },
    testimonial: {
      quote:
        "Mes clientes commandent en ligne facilement. Le paiement en ligne et la livraison en Belgique nous ont vraiment fait gagner en crédibilité.",
      author: "Salimata Koba",
      role: "Fondatrice, Maison Koba — Bruxelles",
    },
  },
  {
    id: "restaurant-saveurs",
    title: "Restaurant Saveurs d'Excellence",
    client: "Saveurs d'Excellence",
    sector: "Restauration",
    location: "Lyon, France",
    year: "2025",
    duration: "16 jours",
    category: "Site vitrine",
    description:
      "Site vitrine pour un restaurant lyonnais : menu digital, réservation WhatsApp, galerie des plats et fiche Google Business optimisée pour le référencement local.",
    tags: ["Menu digital", "SEO local", "WhatsApp"],
    stack: ["Next.js", "Tailwind CSS", "Google Maps", "Resend"],
    image: "/images/realisations/restaurant-saveurs.png",
    imageAlt: "Site vitrine Restaurant Saveurs d'Excellence — Lyon, France",
    accent: "#c8956c",
    metric: { value: "2×", label: "Réservations" },
    caseStudy: {
      challenge:
        "Peu visible sur Google dans le quartier, menu partagé en PDF sur WhatsApp et réservations perdues faute de site professionnel.",
      solution:
        "Site vitrine avec menu interactif, bouton réservation WhatsApp, galerie HD et SEO local « restaurant Lyon ».",
      results: [
        "Doublement des réservations via le site",
        "Visible sur Google Maps en 5 semaines",
        "Menu mis à jour sans développeur",
      ],
    },
    testimonial: {
      quote:
        "Nos clients réservent directement depuis le site. L'équipe SD CREATIV a bien compris notre clientèle et notre quartier.",
      author: "Marie Dupont",
      role: "Gérante, Saveurs d'Excellence — Lyon",
    },
  },
  {
    id: "cabinet-conseil",
    title: "Cabinet H-Conseil Expertise",
    client: "H-Conseil",
    sector: "Conseil & audit",
    location: "Bruxelles, Belgique",
    year: "2024",
    duration: "24 jours",
    category: "Refonte web",
    description:
      "Refonte pour un cabinet belge : nouvelle identité, site responsive, formulaire de rendez-vous et pages services optimisées SEO.",
    tags: ["Refonte UX", "Performance", "Identité visuelle"],
    stack: ["Next.js", "TypeScript", "Resend", "Google Analytics"],
    image: "/images/realisations/cabinet-conseil.png",
    imageAlt: "Site Cabinet H-Conseil Expertise — Bruxelles, Belgique",
    accent: "#0072B5",
    metric: { value: "95", label: "Score Lighthouse" },
    featured: true,
    beforeAfter: {
      beforeLabel: "Site daté de 2017, non responsive, aucune prise de contact en ligne",
      afterLabel: "Site moderne, mobile-first, formulaire de rendez-vous et identité premium",
    },
    caseStudy: {
      challenge:
        "Site vieillissant qui nuisait à la crédibilité du cabinet auprès des PME. Aucun canal de prise de rendez-vous en ligne.",
      solution:
        "Refonte UX/UI complète, nouvelle charte graphique, pages services structurées et formulaire avec notification email instantanée.",
      results: [
        "Score Lighthouse passé de 38 à 95",
        "Temps de chargement divisé par 4",
        "+30 % de demandes de consultation",
      ],
    },
    testimonial: {
      quote:
        "La refonte a redonné une image professionnelle à notre cabinet. Nos clients PME nous disent que le site inspire confiance.",
      author: "Me Hélène Martin",
      role: "Associée fondatrice — Bruxelles, Belgique",
    },
  },
  {
    id: "startup-tech",
    title: "Startup TechFlow",
    client: "TechFlow Europe",
    sector: "Fintech",
    location: "Paris, France",
    year: "2025",
    duration: "12 jours",
    category: "Site vitrine",
    description:
      "Landing page haute conversion pour une startup fintech parisienne : proposition de valeur claire, formulaire de démo et tracking des leads.",
    tags: ["Landing page", "Lead gen", "Animation"],
    stack: ["Next.js", "Framer Motion", "Zapier", "Google Analytics 4"],
    image: "/images/realisations/startup-techflow.png",
    imageAlt: "Capture d'écran de la landing page TechFlow — Paris, France",
    accent: "#667eea",
    metric: { value: "+180", label: "Leads / mois" },
    caseStudy: {
      challenge:
        "TechFlow devait générer des leads qualifiés rapidement avant le salon Money 20/20 à Paris, sans budget publicitaire conséquent.",
      solution:
        "Landing page orientée conversion avec social proof, formulaire de démo en 2 clics, animations légères et intégration CRM via Zapier.",
      results: [
        "+180 leads qualifiés par mois",
        "Taux de conversion formulaire de 8,4 %",
        "Livraison en 12 jours ouvrés",
      ],
    },
  },
  {
    id: "artisan-batiment",
    title: "Artisan Bâtiment Pro",
    client: "Bâtiment Pro Maroc",
    sector: "Bâtiment & rénovation",
    location: "Casablanca, Maroc",
    year: "2024",
    duration: "20 jours",
    category: "SEO Local",
    description:
      "Site vitrine orienté référencement local pour une entreprise de rénovation à Casablanca : portfolio chantiers, avis Google et pages par quartier.",
    tags: ["SEO local", "Google Business", "Portfolio"],
    stack: ["WordPress", "Yoast SEO", "Google Business Profile", "Schema.org"],
    image: "/images/realisations/artisan-batiment.png",
    imageAlt: "Capture d'écran du site Bâtiment Pro — Casablanca, Maroc",
    accent: "#f7971e",
    metric: { value: "Top 3", label: "Google local" },
    caseStudy: {
      challenge:
        "Entreprise réputée localement à Casablanca mais invisible sur Google. 100 % des clients venaient du bouche-à-oreille.",
      solution:
        "Site optimisé SEO local avec pages par quartier (Maarif, Anfa, Ain Diab), intégration avis Google, portfolio avant/après et bouton d'appel direct mobile.",
      results: [
        "Top 3 sur « rénovation Casablanca »",
        "+70 % d'appels entrants via le site",
        "Fiche Google Business optimisée à 100 %",
      ],
    },
    testimonial: {
      quote:
        "Grâce au SEO local, nous sommes visibles sur Google dans notre zone. Résultat concret en quelques semaines.",
      author: "Youssef El Amrani",
      role: "Gérant, Bâtiment Pro — Casablanca",
    },
  },
  {
    id: "ong-humanitaire",
    title: "ONG Solidarité Plus",
    client: "Solidarité Plus ONG",
    sector: "Humanitaire",
    location: "Nairobi, Kenya & Kampala, Ouganda",
    year: "2024",
    duration: "30 jours",
    category: "Site vitrine",
    description:
      "Portail institutionnel bilingue FR/EN pour une ONG active en Afrique de l'Est : module de dons en ligne, galerie de projets et espace partenaires.",
    tags: ["Multilingue", "Dons en ligne", "Institutionnel"],
    stack: ["Next.js", "Stripe", "M-Pesa API", "Cloudinary"],
    image: "/images/realisations/ong-solidarite.png",
    imageAlt: "Capture d'écran du site ONG Solidarité Plus — Kenya & Ouganda",
    accent: "#11998e",
    metric: { value: "+45%", label: "Dons en ligne" },
    caseStudy: {
      challenge:
        "L'ONG recevait des dons uniquement en espèces lors d'événements locaux. Pas de visibilité internationale pour attirer des partenaires.",
      solution:
        "Site bilingue avec module de dons Stripe & M-Pesa, galerie projets terrain en Afrique de l'Est, rapports d'activité téléchargeables et formulaire partenaires.",
      results: [
        "+45 % de dons en ligne",
        "Présence digitale bilingue FR/EN",
        "12 nouveaux partenaires internationaux en 6 mois",
      ],
    },
  },
  {
    id: "clinique-sante",
    title: "Clinique Santé Plus",
    client: "Clinique Santé Plus",
    sector: "Santé",
    location: "Porto, Portugal",
    year: "2025",
    duration: "25 jours",
    category: "Site vitrine",
    description:
      "Portail patient pour une clinique portugaise : prise de rendez-vous en ligne, présentation de l'équipe médicale et contact d'urgence.",
    tags: ["Prise de RDV", "Multilingue PT/EN", "Mobile first"],
    stack: ["Next.js", "Cal.com", "Tailwind CSS", "i18n"],
    image: "/images/realisations/clinique-sante.png",
    imageAlt: "Capture d'écran du portail Clinique Santé Plus — Porto, Portugal",
    accent: "#00a8e8",
    metric: { value: "-40%", label: "Appels manuels" },
    featured: true,
    caseStudy: {
      challenge:
        "La secrétaire passait 4 h/jour au téléphone pour les rendez-vous. Aucune présence en ligne structurée par spécialité pour une clientèle locale et expatriée.",
      solution:
        "Portail patient mobile-first bilingue PT/EN avec prise de RDV par spécialité via Cal.com, fiches médecins, horaires et informations pratiques.",
      results: [
        "-40 % d'appels manuels à l'accueil",
        "60 % des RDV pris en ligne",
        "Score accessibilité AA (RGPD conforme)",
      ],
    },
    testimonial: {
      quote:
        "Nos patients prennent rendez-vous en ligne à toute heure. L'équipe d'accueil peut enfin se concentrer sur l'expérience en présentiel.",
      author: "Dr. Ana Rodrigues",
      role: "Directrice, Clinique Santé Plus — Porto",
    },
  },
  {
    id: "immobilier-prestige",
    title: "Immobilier Prestige Lisboa",
    client: "Prestige Immobilier",
    sector: "Immobilier",
    location: "Lisbonne, Portugal",
    year: "2025",
    duration: "35 jours",
    category: "E-commerce",
    description:
      "Plateforme immobilière pour le marché lisboète : filtres avancés, fiches biens détaillées et prise de contact pour les visites.",
    tags: ["Catalogue biens", "Filtres", "Carte interactive"],
    stack: ["Next.js", "PostgreSQL", "Mapbox", "Stripe"],
    image: "/images/realisations/immobilier-prestige.png",
    imageAlt: "Capture d'écran de Prestige Immobilier — Lisbonne, Portugal",
    accent: "#c9a962",
    metric: { value: "+90%", label: "Demandes qualifiées" },
    caseStudy: {
      challenge:
        "Annonces dispersées sur Idealista et groupes Facebook locaux. Aucun filtrage par budget ou quartier pour les acquéreurs internationaux.",
      solution:
        "Plateforme de listing avec filtres avancés, fiches biens premium, carte interactive Mapbox (Alfama, Chiado, Parque das Nações) et contact par annonce.",
      results: [
        "+90 % de demandes qualifiées",
        "85 annonces actives gérées facilement",
        "Temps de réponse moyen réduit de moitié",
      ],
    },
  },
  {
    id: "academy-elearning",
    title: "Academy E-Learning",
    client: "LearnHub Africa",
    sector: "Formation & éducation",
    location: "Accra, Ghana (100% en ligne)",
    year: "2024",
    duration: "40 jours",
    category: "Refonte web",
    description:
      "Refonte d'une plateforme de formation en ligne pour un acteur ghanéen : espace apprenant, catalogue de 24 cours, paiement par module et certificats PDF.",
    tags: ["E-learning", "Espace membre", "Paiement"],
    stack: ["Next.js", "Stripe", "PDF Generator", "Auth.js"],
    image: "/images/realisations/academy-elearning.png",
    imageAlt: "Capture d'écran de la plateforme LearnHub Africa — Ghana",
    accent: "#8360c3",
    metric: { value: "1 200+", label: "Apprenants actifs" },
    beforeAfter: {
      beforeLabel: "Plateforme WordPress lente, UX confuse, paiements manuels par virement bancaire",
      afterLabel: "Plateforme moderne, parcours fluide, paiement Stripe & carte, certificats automatiques",
    },
    caseStudy: {
      challenge:
        "Ancienne plateforme WordPress lente et peu intuitive. Paiements manuels, certificats envoyés à la main, faible taux de complétion des cours.",
      solution:
        "Refonte complète avec espace apprenant, progression par module, paiement Stripe & carte et génération automatique de certificats PDF.",
      results: [
        "1 200+ apprenants actifs dans 8 pays africains",
        "Taux de complétion +55 %",
        "Certificats générés automatiquement",
      ],
    },
  },
];

export function getRealisation(id: string) {
  return realisations.find((r) => r.id === id);
}

export function getRelatedRealisations(currentId: string, limit = 3) {
  const current = getRealisation(currentId);
  if (!current) return realisations.slice(0, limit);
  return realisations
    .filter((r) => r.id !== currentId && r.category === current.category)
    .slice(0, limit);
}
