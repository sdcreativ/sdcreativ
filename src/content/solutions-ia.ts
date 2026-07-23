import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Headphones,
  Target,
  Workflow,
  Brain,
  MessageSquare,
  Database,
  Shield,
} from "lucide-react";

export type IaUseCase = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  benefits: string[];
};

export type IaStackItem = {
  name: string;
  category: string;
  description: string;
};

export type IaProcessStep = {
  step: number;
  title: string;
  description: string;
};

export type IaPack = {
  id: string;
  name: string;
  tagline: string;
  priceFrom: number;
  features: string[];
  highlighted?: boolean;
};

export const iaUseCases: IaUseCase[] = [
  {
    id: "support",
    icon: Headphones,
    title: "Support client 24/7",
    description:
      "Répondez instantanément aux questions fréquentes sur votre site, WhatsApp ou email — même en dehors des heures de bureau.",
    benefits: [
      "Réduction du volume d'appels et emails",
      "Réponses cohérentes et multilingues (FR/EN)",
      "Escalade vers un humain si besoin",
    ],
  },
  {
    id: "leads",
    icon: Target,
    title: "Qualification de leads",
    description:
      "Collectez budget, délai et besoins avant de transférer le prospect à votre équipe commerciale.",
    benefits: [
      "Leads pré-qualifiés dans votre CRM",
      "Intégration formulaire, WhatsApp, site",
      "Scoring automatique des opportunités",
    ],
  },
  {
    id: "automation",
    icon: Workflow,
    title: "Automatisation métier",
    description:
      "Connectez vos outils (CRM, facturation, stock) pour automatiser les tâches répétitives et fiabiliser vos processus.",
    benefits: [
      "Workflows n8n, Make ou Zapier",
      "Synchronisation de données en temps réel",
      "Alertes et rapports automatiques",
    ],
  },
];

export const iaStack: IaStackItem[] = [
  {
    name: "OpenAI / Claude",
    category: "LLM",
    description: "Modèles de langage pour conversations naturelles et raisonnement.",
  },
  {
    name: "n8n · Make",
    category: "Automatisation",
    description: "Orchestration de workflows et intégrations API.",
  },
  {
    name: "WhatsApp Business API",
    category: "Canal",
    description: "Assistants sur le canal préféré des clients ivoiriens.",
  },
  {
    name: "Vercel · AWS",
    category: "Infrastructure",
    description: "Déploiement sécurisé, scalable et monitoré.",
  },
  {
    name: "Pinecone · pgvector",
    category: "Mémoire",
    description: "Base de connaissances et recherche sémantique.",
  },
  {
    name: "Langfuse",
    category: "Supervision",
    description: "Monitoring, logs et amélioration continue des agents.",
  },
];

export const iaProcess: IaProcessStep[] = [
  {
    step: 1,
    title: "Audit & cadrage",
    description:
      "Analyse de vos processus, canaux clients et objectifs. Définition du périmètre et des KPIs.",
  },
  {
    step: 2,
    title: "Conception de l'agent",
    description:
      "Rédaction des scénarios, base de connaissances, règles d'escalade et intégrations prévues.",
  },
  {
    step: 3,
    title: "Développement & tests",
    description:
      "Intégration LLM, connexion CRM/WhatsApp, tests utilisateurs et ajustements.",
  },
  {
    step: 4,
    title: "Déploiement & formation",
    description:
      "Mise en production, formation de votre équipe et documentation complète.",
  },
  {
    step: 5,
    title: "Supervision & évolution",
    description:
      "Suivi des performances, analyse des conversations et amélioration continue.",
  },
];

export const iaPacks: IaPack[] = [
  {
    id: "assistant-site",
    name: "Assistant site",
    tagline: "Chatbot intégré à votre site web.",
    priceFrom: 0,
    features: [
      "Chatbot site web personnalisé",
      "Base de connaissances métier",
      "10 scénarios conversationnels",
      "Tableau de bord analytics",
      "1 mois de support inclus",
    ],
  },
  {
    id: "whatsapp-pro",
    name: "WhatsApp Pro",
    tagline: "Assistant sur WhatsApp Business.",
    priceFrom: 0,
    highlighted: true,
    features: [
      "Tout Assistant site +",
      "Intégration WhatsApp Business API",
      "Qualification leads automatique",
      "Connexion CRM (HubSpot, Notion…)",
      "3 mois de support prioritaire",
    ],
  },
  {
    id: "automation-suite",
    name: "Automation Suite",
    tagline: "Agent IA + workflows métier.",
    priceFrom: 0,
    features: [
      "Tout WhatsApp Pro +",
      "Workflows n8n / Make sur mesure",
      "Synchronisation multi-outils",
      "Supervision Langfuse",
      "6 mois de support & évolutions",
    ],
  },
];

export const iaFaq = [
  {
    question: "Combien coûte un agent IA ?",
    answer:
      "Chaque pack fait l'objet d'un devis personnalisé gratuit selon le périmètre (assistant site, WhatsApp, automatisation avancée). Contactez-nous pour une estimation adaptée à votre besoin.",
  },
  {
    question: "Quels modèles IA utilisez-vous ?",
    answer:
      "Nous travaillons principalement avec OpenAI (GPT-4o) et Anthropic (Claude), selon les besoins de coût, latence et confidentialité de chaque projet.",
  },
  {
    question: "L'agent peut-il parler français et anglais ?",
    answer:
      "Oui, nos agents sont multilingues. Idéal pour les PME ivoiriennes qui servent une clientèle locale et internationale.",
  },
  {
    question: "Comment garantissez-vous la qualité des réponses ?",
    answer:
      "Base de connaissances validée par vos équipes, règles d'escalade vers un humain, supervision des conversations et amélioration continue.",
  },
  {
    question: "Ce chatbot sur votre site est-il une démo ?",
    answer:
      "Oui — l’assistant en bas à gauche est une démo de notre savoir-faire. En heures ouvrées (lun–ven 8h–18h), un conseiller humain est aussi joignable via le Live Chat / appel audio (bulle dédiée). Hors horaires, l’IA reste disponible avec WhatsApp et prise de rendez-vous.",
  },
  {
    question: "Comment cohabitent l’assistant IA et le chat conseiller ?",
    answer:
      "L’IA répond aux questions fréquentes et oriente. Dès qu’un humain est utile (devis ferme, appel, négociation), elle propose d’ouvrir le chat conseiller 3CX en heures ouvrées, ou un RDV / WhatsApp hors horaires.",
  },
] as const;

export const iaDemoHighlights = [
  { icon: Bot, label: "Agent conversationnel", detail: "Comme celui sur ce site" },
  { icon: MessageSquare, label: "Multi-canal", detail: "Site, WhatsApp, email" },
  { icon: Brain, label: "LLM avancés", detail: "OpenAI, Claude" },
  { icon: Database, label: "Base métier", detail: "Vos tarifs, FAQ, process" },
  { icon: Shield, label: "Sécurisé", detail: "Données hébergées, RGPD" },
] as const;
