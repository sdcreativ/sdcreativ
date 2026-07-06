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
    id: "agents-ia",
    icon: Bot,
    title: "Agents IA",
    description:
      "Nous concevons et déployons des agents intelligents pour automatiser vos interactions, votre support client et vos processus métier.",
    features: [
      "Chatbots & assistants conversationnels",
      "Intégration LLM (OpenAI, Claude, etc.)",
      "Agents métier sur mesure",
      "Connexion à vos outils (CRM, email, WhatsApp)",
      "Analyse, supervision & amélioration continue",
    ],
    image: "/images/services/agents-ia.png",
    imageAlt: "Interface de configuration d'agents IA et assistants conversationnels",
    detailHref: "/solutions-ia",
    detailLabel: "Découvrir nos solutions IA",
  },
  {
    id: "automatisation",
    icon: Zap,
    title: "Automatisation",
    description:
      "Automatisez vos tâches répétitives et connectez vos applications pour gagner du temps et fiabiliser vos opérations.",
    features: [
      "Workflows automatisés (n8n, Make, Zapier)",
      "Intégrations API & webhooks",
      "Synchronisation de données",
      "Notifications & alertes intelligentes",
      "Tableaux de bord & suivi des flux",
    ],
    image: "/images/services/automatisation.png",
    imageAlt: "Schéma de workflows automatisés connectant plusieurs applications",
  },
  {
    id: "devops",
    icon: GitBranch,
    title: "DevOps",
    description:
      "Industrialisez vos déploiements et sécurisez votre chaîne de développement pour livrer plus vite, en toute confiance.",
    features: [
      "Pipelines CI/CD (GitHub Actions, GitLab)",
      "Conteneurisation Docker",
      "Monitoring, logs & alertes",
      "Infrastructure as Code (Terraform, Ansible)",
      "Bonnes pratiques sécurité & revue de code",
    ],
    image: "/images/services/devops.png",
    imageAlt: "Tableau de bord DevOps avec pipelines CI/CD et monitoring",
  },
  {
    id: "cloud",
    icon: Cloud,
    title: "Cloud",
    description:
      "Hébergement, migration et optimisation cloud pour des applications scalables, disponibles et performantes.",
    features: [
      "AWS, Google Cloud, Azure & Vercel",
      "Migration vers le cloud",
      "Architecture haute disponibilité",
      "Optimisation des coûts cloud",
      "Sauvegardes & reprise après incident",
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
  "Sites vitrines",
  "E-commerce",
  "Refonte web",
  "SEO local",
  "Maintenance",
] as const;

export const heroHighlights = [
  { label: "100% Responsive", description: "Adapté à tous les écrans" },
  { label: "SEO Optimisé", description: "Visible sur Google" },
  { label: "Livraison Accompagnée", description: "De A à Z avec vous" },
  { label: "Support Après mise en ligne", description: "On reste à vos côtés" },
] as const;
