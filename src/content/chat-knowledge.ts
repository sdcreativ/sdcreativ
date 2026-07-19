export type ChatKnowledgeEntry = {
  id: string;
  keywords: string[];
  answer: string;
  links?: { label: string; href: string }[];
};

/** Accueil générique — le widget utilise `getAiGreeting` (Phase 7) selon les horaires. */
export const chatGreeting =
  "Bonjour ! Je suis l'assistant SD CREATIV. Posez-moi vos questions sur nos services, tarifs ou délais — je suis là pour vous orienter.";

export const chatSuggestions = [
  "Quels sont vos tarifs ?",
  "Combien de temps pour un site ?",
  "Proposez-vous des agents IA ?",
  "Maintenance et SLA ?",
] as const;

export const chatKnowledge: ChatKnowledgeEntry[] = [
  {
    id: "tarifs",
    keywords: [
      "tarif", "prix", "coût", "cout", "combien", "fcfa", "budget", "devis", "estimation",
      "essentiel", "professionnel", "business", "formule", "offre",
    ],
    answer:
      "Nos formules démarrent à 350 000 FCFA HT (Essentiel — site vitrine), 850 000 FCFA HT (Professionnel) et 1 800 000 FCFA HT (Business — e-commerce). Les agents IA démarrent à 800 000 FCFA, la maintenance annuelle à 480 000 FCFA. Chaque projet fait l'objet d'un devis personnalisé gratuit.",
    links: [
      { label: "Voir les tarifs", href: "/tarifs" },
      { label: "Configurateur de devis", href: "/devis" },
    ],
  },
  {
    id: "delais",
    keywords: [
      "délai", "delai", "durée", "duree", "temps", "livraison", "jours", "semaines", "rapide",
    ],
    answer:
      "En moyenne, comptez 15 à 30 jours pour un site vitrine ou e-commerce selon la complexité. Les projets agents IA ou sur mesure peuvent prendre 4 à 8 semaines. Nous établissons un calendrier précis dès la validation du devis.",
    links: [{ label: "Demander un devis", href: "/devis" }],
  },
  {
    id: "services",
    keywords: [
      "service", "offre", "prestation", "faire", "proposez", "activité", "digital",
      "vitrine", "e-commerce", "ecommerce", "boutique", "refonte", "seo", "identité",
    ],
    answer:
      "SD CREATIV propose 12 services : site vitrine, e-commerce, refonte web, identité visuelle, SEO local, maintenance, agents IA, automatisation, DevOps, cloud, applications mobiles et développement sur mesure. Basés à Abidjan, nous accompagnons les PME ivoiriennes.",
    links: [
      { label: "Nos services", href: "/services" },
      { label: "Solutions IA", href: "/solutions-ia" },
    ],
  },
  {
    id: "ia",
    keywords: [
      "ia", "intelligence", "artificielle", "agent", "chatbot", "bot", "openai", "claude",
      "llm", "automatisation", "assistant", "whatsapp",
    ],
    answer:
      "Nous concevons des agents IA sur mesure : chatbots site web, assistants WhatsApp, qualification de leads et automatisation métier. Stack : OpenAI, Claude, n8n, intégrations CRM. À partir de 800 000 FCFA HT. Ce chatbot est d'ailleurs une démo de notre savoir-faire !",
    links: [
      { label: "Solutions IA", href: "/solutions-ia" },
      { label: "Devis agents IA", href: "/devis?type=agents-ia" },
    ],
  },
  {
    id: "maintenance",
    keywords: [
      "maintenance", "sla", "support", "sauvegarde", "mise à jour", "mise a jour",
      "monitoring", "abonnement", "mensuel", "annuel", "forfait",
    ],
    answer:
      "Nous proposons 3 formules maintenance : Essentiel (45 000 FCFA/mois ou 480 000 FCFA/an), Professionnel (85 000 FCFA/mois) et Premium SLA (150 000 FCFA/mois, réponse sous 4h). Inclus : sauvegardes, mises à jour, monitoring et assistance technique.",
    links: [
      { label: "Formules maintenance", href: "/maintenance" },
      { label: "Devis maintenance", href: "/devis?type=maintenance" },
    ],
  },
  {
    id: "contact",
    keywords: [
      "contact", "contacter", "appeler", "email", "rdv", "rendez-vous", "rendez vous",
      "rencontrer", "équipe", "equipe", "abidjan",
    ],
    answer:
      "En heures ouvrées (lun–ven 8h–18h Abidjan), un conseiller répond via le Live Chat / appel audio (bulle en bas à droite). Hors horaires : WhatsApp, formulaire de contact ou prise de rendez-vous en ligne. Nous sommes basés à Abidjan.",
    links: [
      { label: "Prendre rendez-vous", href: "/rendez-vous" },
      { label: "Contact", href: "/contact" },
      { label: "Audit web gratuit", href: "/audit-gratuit" },
    ],
  },
  {
    id: "conseiller",
    keywords: [
      "conseiller", "humain", "personne", "appeler", "téléphone", "telephone",
      "live chat", "3cx", "parler à", "parler a", "agent",
    ],
    answer:
      "Oui — du lundi au vendredi, 8h–18h (Abidjan), ouvrez le chat conseiller (ou un appel audio) via la bulle en bas à droite. Hors horaires, prenez rendez-vous ou écrivez-nous sur WhatsApp ; un humain reprendra dès l’ouverture.",
    links: [
      { label: "Prendre rendez-vous", href: "/rendez-vous" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    id: "mobile",
    keywords: ["mobile", "responsive", "smartphone", "tablette", "adapté", "adapte"],
    answer:
      "Oui, 100 % de nos sites sont responsive — optimisés pour smartphone, tablette et desktop. C'est inclus dans toutes nos formules.",
    links: [{ label: "Nos tarifs", href: "/tarifs" }],
  },
  {
    id: "ecommerce",
    keywords: [
      "mobile money", "orange money", "wave", "momo", "paiement", "commande", "vente en ligne",
    ],
    answer:
      "Notre formule Business (à partir de 1 800 000 FCFA HT) inclut une boutique e-commerce complète avec paiement Mobile Money (Orange Money, Wave), gestion des commandes et formation admin.",
    links: [
      { label: "Tarifs e-commerce", href: "/tarifs" },
      { label: "Estimer mon projet", href: "/devis?type=e-commerce" },
    ],
  },
];

export const chatFallback =
  "Je n'ai pas trouvé de réponse précise à votre question. En heures ouvrées, ouvrez le chat conseiller (bas à droite). Sinon : WhatsApp, formulaire de contact ou prise de rendez-vous.";
