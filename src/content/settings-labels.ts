export type IntegrationStatus = "ok" | "configured" | "degraded" | "missing";

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  ok: "Opérationnel",
  configured: "Configuré",
  degraded: "Dégradé",
  missing: "Non configuré",
};

export const INTEGRATION_STATUS_STYLES: Record<IntegrationStatus, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  configured: "bg-sky-100 text-sky-700",
  degraded: "bg-amber-100 text-amber-700",
  missing: "bg-gray-light text-gray-text",
};

export type EmailTemplateInfo = {
  id: string;
  label: string;
  route: string;
  subjectPattern: string;
  description: string;
};

export const EMAIL_TEMPLATES: EmailTemplateInfo[] = [
  {
    id: "contact",
    label: "Formulaire contact",
    route: "/api/contact",
    subjectPattern: "[SD CREATIV] Contact — {service} — {nom}",
    description: "Notification interne à chaque message reçu via le site.",
  },
  {
    id: "devis",
    label: "Devis en ligne",
    route: "/api/devis",
    subjectPattern: "[SD CREATIV] Devis en ligne — {projet} — {nom}",
    description: "Récapitulatif du configurateur de devis avec montants estimés.",
  },
  {
    id: "carriere",
    label: "Candidature carrière",
    route: "/api/carriere",
    subjectPattern: "[SD CREATIV] Candidature — {poste} — {nom}",
    description: "Alerte RH avec coordonnées du candidat.",
  },
  {
    id: "waitlist",
    label: "Liste d'attente Phase 2",
    route: "/api/waitlist",
    subjectPattern: "[Phase 2] {intérêt} — {nom}",
    description: "Inscriptions aux fonctionnalités à venir.",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    route: "/api/newsletter",
    subjectPattern: "[SD CREATIV] Nouvelle inscription newsletter",
    description: "Notification à chaque nouvel abonné.",
  },
];
