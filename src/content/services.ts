import {
  Globe,
  ShoppingCart,
  RefreshCw,
  Palette,
  MapPin,
  Wrench,
  Bot,
  Zap,
  GitBranch,
  Cloud,
  Smartphone,
  Code2,
  type LucideIcon,
} from "lucide-react";

export type Service = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  image?: string;
  imageAlt?: string;
  detailHref?: string;
  detailLabel?: string;
};

export const services: Service[] = [
  {
    id: "site-vitrine",
    icon: Globe,
    title: "Site vitrine",
    description:
      "Un site professionnel pour présenter votre activité et convertir vos visiteurs en clients.",
    features: [
      "3 à 7 pages sur mesure",
      "Design responsive",
      "Formulaire de contact",
      "Intégration WhatsApp",
      "SEO de base",
    ],
    image: "/images/services/site-vitrine.png",
    imageAlt: "Exemple de site vitrine professionnel sur ordinateur et mobile",
  },
  {
    id: "agents-ia",
    icon: Bot,
    title: "Agents IA",
    description:
      "Des assistants qui répondent à vos clients, qualifient vos leads et relancent vos prospects — sur votre site et WhatsApp, 24h/24.",
    features: [
      "Accueil, commercial, support et FAQ documentaire",
      "Devis, RDV, e-commerce et relances",
      "CRM, admin, RH et finance / facturation",
      "Escalade vers un humain quand c’est nécessaire",
      "Combinables selon vos priorités métier",
    ],
    image: "/images/services/agents-ia.png",
    imageAlt: "Interface de configuration d'agents IA et assistants conversationnels",
    detailHref: "/solutions-ia",
    detailLabel: "Voir les cas d’usage marketing",
  },
  {
    id: "automatisation",
    icon: Zap,
    title: "Automatisation",
    description:
      "Moins de copier-coller, plus de suivi : relances, notifications et synchronisation entre vos outils pour gagner du temps chaque semaine.",
    features: [
      "Relances et rappels automatiques",
      "Connexion site, CRM, email et WhatsApp",
      "Synchronisation des contacts et demandes",
      "Alertes quand un lead est chaud",
      "Tableaux de bord simples pour piloter",
    ],
    image: "/images/services/automatisation.png",
    imageAlt: "Schéma de workflows automatisés connectant plusieurs applications",
  },
  {
    id: "e-commerce",
    icon: ShoppingCart,
    title: "E-commerce",
    description:
      "Vendez en ligne avec une boutique performante, sécurisée et simple à administrer.",
    features: [
      "Catalogue produits",
      "Gestion des commandes",
      "Paiement en ligne",
      "Tableau de bord admin",
      "Formation à la prise en main",
    ],
    image: "/images/services/e-commerce.png",
    imageAlt: "Interface e-commerce avec catalogue produits et panier",
  },
  {
    id: "refonte-web",
    icon: RefreshCw,
    title: "Refonte web",
    description:
      "Modernisez votre site existant pour améliorer l'image, la performance et l'expérience utilisateur.",
    features: [
      "Nouveau design",
      "Optimisation mobile",
      "Amélioration des performances",
      "Refonte UX/UI",
      "Migration sécurisée",
    ],
    image: "/images/services/refonte-web.png",
    imageAlt: "Comparaison avant/après d'une refonte de site web",
  },
  {
    id: "identite-visuelle",
    icon: Palette,
    title: "Identité visuelle",
    description:
      "Construisez une image de marque cohérente et mémorable sur tous vos supports.",
    features: [
      "Création de logo",
      "Supports marketing",
      "Réseaux sociaux",
      "Charte graphique",
      "Déclinaisons print & web",
    ],
    image: "/images/services/identite-visuelle.png",
    imageAlt: "Création d'identité visuelle : logo, couleurs et charte graphique",
  },
  {
    id: "seo-local",
    icon: MapPin,
    title: "SEO Local",
    description:
      "Gagnez en visibilité sur Google et attirez des clients près de chez vous.",
    features: [
      "Optimisation Google Business",
      "Structure SEO",
      "Référencement local",
      "Contenus optimisés",
      "Suivi des performances",
    ],
    image: "/images/services/seo-local.png",
    imageAlt: "Référencement local SEO avec Google Maps et analytics",
  },
  {
    id: "maintenance",
    icon: Wrench,
    title: "Maintenance",
    description:
      "Gardez votre site rapide, sécurisé et à jour avec un accompagnement continu.",
    features: [
      "Sauvegardes régulières",
      "Assistance technique",
      "Mises à jour",
      "Monitoring",
      "Support réactif",
    ],
    image: "/images/services/maintenance.png",
    imageAlt: "Maintenance et support technique de site web",
    detailHref: "/maintenance",
    detailLabel: "Formules maintenance & SLA",
  },
  {
    id: "devops",
    icon: GitBranch,
    title: "DevOps",
    description:
      "Des mises en ligne fiables et régulières : votre site ou application évolue sans stress, avec monitoring et bonnes pratiques de sécurité.",
    features: [
      "Déploiements automatisés et reproductibles",
      "Environnements de test avant la prod",
      "Surveillance, alertes et journaux",
      "Infrastructure maîtrisée et documentée",
      "Sécurité et revue des changements",
    ],
    image: "/images/services/devops.png",
    imageAlt: "Tableau de bord DevOps avec pipelines CI/CD et monitoring",
  },
  {
    id: "cloud",
    icon: Cloud,
    title: "Cloud",
    description:
      "Un hébergement solide pour rester en ligne, charger vite et grandir sans surprise — avec sauvegardes et coûts sous contrôle.",
    features: [
      "Hébergement performant et disponible",
      "Migration sans interruption inutile",
      "Sauvegardes et reprise après incident",
      "Optimisation des coûts d’infrastructure",
      "Accompagnement pour évoluer en douceur",
    ],
    image: "/images/services/cloud.png",
    imageAlt: "Architecture cloud scalable avec serveurs et métriques de performance",
  },
  {
    id: "applications-mobiles",
    icon: Smartphone,
    title: "Applications mobiles",
    description:
      "Des applications iOS et Android performantes pour fidéliser vos clients, digitaliser vos services et rester accessibles partout.",
    features: [
      "Apps natives & cross-platform (React Native, Flutter)",
      "Design UI/UX mobile-first",
      "Notifications push",
      "Connexion à votre site ou back-office",
      "Publication App Store & Google Play",
    ],
    image: "/images/services/applications-mobiles.png",
    imageAlt: "Applications mobiles iOS et Android avec interface professionnelle",
  },
  {
    id: "developpement-sur-mesure",
    icon: Code2,
    title: "Développement sur mesure",
    description:
      "Plateformes web, SaaS et outils métier conçus sur mesure pour répondre précisément à vos processus et faire évoluer votre activité.",
    features: [
      "Applications web & SaaS personnalisés",
      "Portails clients & intranets",
      "APIs & intégrations tierces",
      "Tableaux de bord & reporting",
      "Évolutivité & maintenance long terme",
    ],
    image: "/images/services/developpement-sur-mesure.png",
    imageAlt: "Plateforme web sur mesure avec modules métier et tableau de bord",
  },
];

export const heroFeatures = [
  "Agents IA",
  "Sites & e-commerce",
  "Leads & WhatsApp",
  "SEO local",
  "Automatisation",
] as const;

export const heroHighlights = [
  { label: "Plus de leads", description: "Visibilité et conversion" },
  { label: "Réponses 24/7", description: "Agents sur site & WhatsApp" },
  { label: "Temps gagné", description: "Moins de tâches manuelles" },
  { label: "Accompagnement", description: "De la stratégie à la mise en ligne" },
] as const;
