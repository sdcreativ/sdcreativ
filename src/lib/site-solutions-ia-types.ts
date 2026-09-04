import type { LucideIconName } from "@/lib/lucide-icon-map";

export type IaUseCaseStored = {
  id: string;
  icon: LucideIconName;
  title: string;
  description: string;
  benefits: string[];
};

export type IaStackItemStored = {
  name: string;
  category: string;
  description: string;
};

export type IaProcessStepStored = {
  step: number;
  title: string;
  description: string;
};

export type IaPackStored = {
  id: string;
  name: string;
  tagline: string;
  priceFrom: number;
  features: string[];
  highlighted?: boolean;
};

export type IaFaqItemStored = {
  question: string;
  answer: string;
};

export type IaDemoHighlightStored = {
  icon: LucideIconName;
  label: string;
  detail: string;
};

export type SectionHeadingStored = {
  eyebrow: string;
  title: string;
  highlight: string;
  description?: string;
};

export type SiteSolutionsIaSettings = {
  demoSection: {
    title: string;
    description: string;
    hint: string;
  };
  headings: {
    useCases: SectionHeadingStored;
    stack: SectionHeadingStored;
    process: SectionHeadingStored;
    packs: SectionHeadingStored;
  };
  ctaSection: {
    title: string;
    description: string;
  };
  useCases: IaUseCaseStored[];
  stack: IaStackItemStored[];
  process: IaProcessStepStored[];
  packs: IaPackStored[];
  faq: IaFaqItemStored[];
  demoHighlights: IaDemoHighlightStored[];
};

export const defaultSiteSolutionsIaSettings: SiteSolutionsIaSettings = {
  demoSection: {
    title: "Essayez un agent IA en live",
    description:
      "L’assistant en bas à gauche montre concrètement ce que vos visiteurs peuvent vivre : réponses utiles, orientation commerciale, et passage à un humain si besoin.",
    hint: "Cliquez sur « Kady » pour l’essayer →",
  },
  headings: {
    useCases: {
      eyebrow: "Notre catalogue",
      title: "12 types d’agents",
      highlight: "pour votre métier",
      description:
        "De l’accueil client à la facturation : chaque agent a un rôle clair. On les combine selon vos priorités marketing et opérationnelles.",
    },
    stack: {
      eyebrow: "Sous le capot",
      title: "Fiable,",
      highlight: "discret",
      description:
        "Nous choisissons les bons outils pour la qualité des réponses, la sécurité et votre budget — vous voyez surtout le résultat business.",
    },
    process: {
      eyebrow: "Notre méthode",
      title: "De l’idée",
      highlight: "au résultat",
    },
    packs: {
      eyebrow: "Formules",
      title: "Packs",
      highlight: "sur devis",
      description:
        "Chaque projet fait l’objet d’un devis personnalisé gratuit après un échange sur vos objectifs marketing.",
    },
  },
  ctaSection: {
    title: "Quel agent voulez-vous déployer en premier ?",
    description:
      "Accueil, commercial, support, devis, e-commerce… Parlons de votre priorité — devis personnalisé gratuit.",
  },
  useCases: [
    {
      id: "accueil",
      icon: "Handshake",
      title: "Agent d’accueil / réception",
      description:
        "Accueille le visiteur, comprend sa demande, répond aux questions générales et oriente vers le bon service ou le bon agent.",
      benefits: [
        "Premier contact immédiat, 24h/24",
        "Orientation claire vers le bon interlocuteur",
        "Moins de questions perdues dès l’entrée",
      ],
    },
    {
      id: "commercial",
      icon: "Target",
      title: "Agent commercial",
      description:
        "Identifie le besoin, présente vos offres, qualifie le prospect, récupère les coordonnées et crée un lead dans le CRM — avec proposition de rendez-vous si besoin.",
      benefits: [
        "Qualification : besoin, budget, délai",
        "Lead créé dans votre CRM",
        "Recommandation d’offre + prise de RDV",
      ],
    },
    {
      id: "support",
      icon: "Headphones",
      title: "Agent support client",
      description:
        "Traite les problèmes courants, s’appuie sur votre documentation, guide étape par étape, crée un ticket et transfère à un humain si nécessaire.",
      benefits: [
        "Réponses guidées sur les cas fréquents",
        "Création de ticket quand c’est requis",
        "Escalade humaine sans friction",
      ],
    },
    {
      id: "faq",
      icon: "Brain",
      title: "Agent FAQ / connaissance",
      description:
        "Spécialiste de vos documents : procédures, catalogues, contrats, pages du site… Il devient le « cerveau documentaire » réutilisable par les autres agents.",
      benefits: [
        "Réponses basées sur vos vrais documents",
        "PDF, procédures, catalogues, site",
        "Base commune pour tous vos agents",
      ],
    },
    {
      id: "rdv",
      icon: "Clock",
      title: "Agent prise de rendez-vous",
      description:
        "Consulte les disponibilités, propose un créneau, crée / modifie / annule un rendez-vous et envoie des rappels.",
      benefits: [
        "Créneaux proposés automatiquement",
        "Création et modification de RDV",
        "Rappels pour limiter les no-shows",
      ],
    },
    {
      id: "devis",
      icon: "FileSpreadsheet",
      title: "Agent devis",
      description:
        "Recueille les besoins, sélectionne les prestations, calcule une estimation et prépare une demande de devis — avec validation humaine avant envoi final.",
      benefits: [
        "Besoins et prestations structurés",
        "Estimation préparée rapidement",
        "Validation humaine avant envoi",
      ],
    },
    {
      id: "ecommerce",
      icon: "ShoppingCart",
      title: "Agent e-commerce",
      description:
        "Recherche les produits, recommande, compare, vérifie prix et disponibilité, accompagne jusqu’au panier et propose du cross-selling / upselling.",
      benefits: [
        "Aide à trouver le bon produit",
        "Disponibilité et prix à jour",
        "Panier + ventes additionnelles",
      ],
    },
    {
      id: "relance",
      icon: "RefreshCw",
      title: "Agent de relance commerciale",
      description:
        "Repère les prospects sans réponse, prépare ou déclenche des relances personnalisées, et s’arrête dès que le prospect répond ou convertit.",
      benefits: [
        "Moins de leads oubliés",
        "Messages personnalisés",
        "Stop automatique dès engagement",
      ],
    },
    {
      id: "crm",
      icon: "FolderKanban",
      title: "Agent CRM",
      description:
        "Crée et met à jour les fiches, résume les conversations, classe les leads, met à jour le statut d’opportunité et propose la prochaine action commerciale.",
      benefits: [
        "Fiches clients à jour",
        "Résumés de conversations",
        "Prochaine action recommandée",
      ],
    },
    {
      id: "admin",
      icon: "Building2",
      title: "Agent administratif",
      description:
        "Répond aux questions internes, aide à produire des documents, retrouve les procédures et automatise certaines tâches administratives répétitives.",
      benefits: [
        "Accès rapide aux procédures",
        "Aide à la rédaction de documents",
        "Moins de tâches admin manuelles",
      ],
    },
    {
      id: "rh",
      icon: "Users",
      title: "Agent RH",
      description:
        "Répond aux salariés, cherche dans les documents RH, aide à l’onboarding, centralise les demandes internes et peut assister le recrutement.",
      benefits: [
        "FAQ RH et onboarding",
        "Demandes internes centralisées",
        "Appui au recrutement",
      ],
    },
    {
      id: "finance",
      icon: "LineChart",
      title: "Agent finance / facturation",
      description:
        "Informe sur les factures, détecte les impayés, prépare les relances, explique les échéances et transmet les dossiers sensibles au responsable.",
      benefits: [
        "Infos factures et échéances",
        "Relances d’impayés préparées",
        "Escalade des dossiers sensibles",
      ],
    },
  ],
  stack: [
    {
      name: "Conversations naturelles",
      category: "Expérience client",
      description: "Des réponses claires, adaptées à votre offre et à votre ton de marque.",
    },
    {
      name: "WhatsApp & site web",
      category: "Canaux",
      description: "Là où vos clients vous écrivent déjà — site, WhatsApp, email.",
    },
    {
      name: "CRM & outils métier",
      category: "Commercial",
      description: "Les demandes rejoignent votre suivi commercial sans ressaisie.",
    },
    {
      name: "Base de connaissances",
      category: "Contenu",
      description: "Tarifs, FAQ, process : l’agent s’appuie sur vos informations validées.",
    },
    {
      name: "Hébergement sécurisé",
      category: "Fiabilité",
      description: "Disponibilité, sauvegardes et bonnes pratiques de confidentialité.",
    },
    {
      name: "Pilotage & amélioration",
      category: "Performance",
      description: "Suivi des conversations pour affiner les réponses dans le temps.",
    },
  ],
  process: [
    {
      step: 1,
      title: "Objectifs marketing",
      description:
        "Quels leads, quelles questions clients, quels canaux ? On fixe le périmètre et les indicateurs de succès.",
    },
    {
      step: 2,
      title: "Scénarios & contenus",
      description:
        "Parcours conversationnels, FAQ, ton de marque et règles de passage à un humain.",
    },
    {
      step: 3,
      title: "Mise en place & tests",
      description:
        "Connexion site / WhatsApp / CRM, essais avec votre équipe, ajustements avant le lancement.",
    },
    {
      step: 4,
      title: "Lancement & formation",
      description: "Mise en production, prise en main par vos équipes et documentation simple.",
    },
    {
      step: 5,
      title: "Suivi & optimisation",
      description:
        "Analyse des échanges, amélioration des réponses et évolution selon vos retours terrain.",
    },
  ],
  packs: [
    {
      id: "assistant-site",
      name: "Assistant site",
      tagline: "Un agent sur votre site pour convertir les visiteurs.",
      priceFrom: 0,
      features: [
        "Chat intégré à votre site",
        "FAQ et offres de votre entreprise",
        "Scénarios d’accueil et d’orientation",
        "Tableau de bord des conversations",
        "1 mois d’accompagnement inclus",
      ],
    },
    {
      id: "whatsapp-pro",
      name: "WhatsApp Pro",
      tagline: "Le canal préféré de vos clients, automatisé.",
      priceFrom: 0,
      highlighted: true,
      features: [
        "Tout Assistant site +",
        "Agent sur WhatsApp Business",
        "Qualification de leads automatique",
        "Passage vers votre CRM / suivi commercial",
        "3 mois de support prioritaire",
      ],
    },
    {
      id: "automation-suite",
      name: "Suite marketing",
      tagline: "Agent IA + relances et synchronisations.",
      priceFrom: 0,
      features: [
        "Tout WhatsApp Pro +",
        "Relances et workflows métier",
        "Synchronisation multi-outils",
        "Pilotage et amélioration continue",
        "6 mois de support & évolutions",
      ],
    },
  ],
  faq: [
    {
      question: "Combien coûte un agent IA ?",
      answer:
        "Chaque formule fait l’objet d’un devis personnalisé gratuit selon vos canaux (site, WhatsApp) et vos objectifs (support, leads, relances). Contactez-nous pour une estimation adaptée.",
    },
    {
      question: "Faut-il être une grande entreprise ?",
      answer:
        "Non. Nos packs sont pensés pour les PME et commerces : démarrer simple (site ou WhatsApp), puis enrichir quand le volume de demandes augmente.",
    },
    {
      question: "L’agent peut-il parler français et anglais ?",
      answer:
        "Oui. Idéal pour les PME qui servent une clientèle locale et internationale.",
    },
    {
      question: "Comment garantissez-vous la qualité des réponses ?",
      answer:
        "Contenus validés avec vous, règles d’escalade vers un humain, suivi des conversations et amélioration continue.",
    },
    {
      question: "Comment fonctionne l’assistant sur ce site ?",
      answer:
        "Kady, en bas à gauche, est l’assistance virtuelle de SD CREATIV. En heures ouvrées, un conseiller peut aussi vous répondre ; hors horaires, l’IA reste disponible avec WhatsApp et prise de rendez-vous.",
    },
    {
      question: "Comment cohabitent l’assistant IA et le chat conseiller ?",
      answer:
        "L’IA traite les questions fréquentes et oriente. Dès qu’un humain est utile (devis ferme, appel, négociation), elle propose le chat conseiller en heures ouvrées, ou un RDV / WhatsApp hors horaires.",
    },
  ],
  demoHighlights: [
    { icon: "Bot", label: "12 types d’agents", detail: "Catalogue métier complet" },
    { icon: "MessageSquare", label: "Multi-canal", detail: "Site, WhatsApp, email" },
    { icon: "Target", label: "Commercial & leads", detail: "Qualification + CRM" },
    { icon: "Database", label: "Cerveau documentaire", detail: "PDF, procédures, site" },
    { icon: "Shield", label: "Escalade humaine", detail: "Quand c’est nécessaire" },
  ],
};
