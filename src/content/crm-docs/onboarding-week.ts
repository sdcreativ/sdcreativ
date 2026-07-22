/**
 * Parcours guidé « Première semaine » — étapes stables (step_id) → slug doc.
 */
export type CrmDocOnboardingStep = {
  id: string;
  day: 1 | 2 | 3 | 4 | 5;
  docSlug: string;
  titleFr: string;
  titleEn: string;
  hintFr: string;
  hintEn: string;
};

export const CRM_DOC_ONBOARDING_WEEK: CrmDocOnboardingStep[] = [
  {
    id: "d1-dashboard",
    day: 1,
    docSlug: "dashboard",
    titleFr: "Découvrir le tableau de bord",
    titleEn: "Explore the dashboard",
    hintFr: "Repérez les KPI et widgets selon votre rôle.",
    hintEn: "Spot KPIs and widgets for your role.",
  },
  {
    id: "d1-profile",
    day: 1,
    docSlug: "profile",
    titleFr: "Compléter mon profil",
    titleEn: "Complete your profile",
    hintFr: "Photo, téléphone, préférences 2FA.",
    hintEn: "Photo, phone, 2FA preferences.",
  },
  {
    id: "d1-inbox",
    day: 1,
    docSlug: "inbox",
    titleFr: "Ouvrir l’Inbox",
    titleEn: "Open the Inbox",
    hintFr: "Traitez les éléments du jour.",
    hintEn: "Work through today’s items.",
  },
  {
    id: "d2-leads",
    day: 2,
    docSlug: "leads",
    titleFr: "Pipeline leads",
    titleEn: "Leads pipeline",
    hintFr: "Créer / déplacer une carte kanban.",
    hintEn: "Create / move a kanban card.",
  },
  {
    id: "d2-quotes",
    day: 2,
    docSlug: "quotes",
    titleFr: "Créer un devis",
    titleEn: "Create a quote",
    hintFr: "Catalogue, PDF, signature.",
    hintEn: "Catalog, PDF, signature.",
  },
  {
    id: "d2-click-to-call",
    day: 2,
    docSlug: "click-to-call",
    titleFr: "Click-to-call 3CX",
    titleEn: "3CX click-to-call",
    hintFr: "Appeler depuis une fiche lead/client.",
    hintEn: "Call from a lead/client record.",
  },
  {
    id: "d3-clients",
    day: 3,
    docSlug: "clients",
    titleFr: "Fiches clients",
    titleEn: "Client records",
    hintFr: "Contacts, projets liés, historique.",
    hintEn: "Contacts, linked projects, history.",
  },
  {
    id: "d3-projects",
    day: 3,
    docSlug: "projects",
    titleFr: "Projets & livraison",
    titleEn: "Projects & delivery",
    hintFr: "Statuts, équipe, livrables.",
    hintEn: "Statuses, team, deliverables.",
  },
  {
    id: "d3-tasks",
    day: 3,
    docSlug: "tasks",
    titleFr: "Tâches du jour",
    titleEn: "Today’s tasks",
    hintFr: "Assignation et échéances.",
    hintEn: "Assignment and due dates.",
  },
  {
    id: "d4-messagerie",
    day: 4,
    docSlug: "messagerie",
    titleFr: "Messagerie",
    titleEn: "Mailbox",
    hintFr: "Répondre depuis le CRM.",
    hintEn: "Reply from the CRM.",
  },
  {
    id: "d4-tickets",
    day: 4,
    docSlug: "tickets",
    titleFr: "Tickets support",
    titleEn: "Support tickets",
    hintFr: "SLA et priorités.",
    hintEn: "SLA and priorities.",
  },
  {
    id: "d4-calendar",
    day: 4,
    docSlug: "calendar",
    titleFr: "Calendrier",
    titleEn: "Calendar",
    hintFr: "RDV et rappels.",
    hintEn: "Meetings and reminders.",
  },
  {
    id: "d5-reports",
    day: 5,
    docSlug: "reports",
    titleFr: "Rapports",
    titleEn: "Reports",
    hintFr: "Lire un indicateur clé de votre métier.",
    hintEn: "Read a key metric for your role.",
  },
  {
    id: "d5-docs",
    day: 5,
    docSlug: "roles-permissions",
    titleFr: "Rôles & permissions",
    titleEn: "Roles & permissions",
    hintFr: "Comprendre ce que vous pouvez faire.",
    hintEn: "Understand what you can access.",
  },
  {
    id: "d5-favorites",
    day: 5,
    docSlug: "dashboard",
    titleFr: "Épingler Mes modules",
    titleEn: "Pin My modules",
    hintFr: "Favoris doc adaptés à votre métier.",
    hintEn: "Doc favorites for your job.",
  },
];
