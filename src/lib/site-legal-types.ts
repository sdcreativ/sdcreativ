import {
  privacyPolicySections,
  type PrivacySection,
} from "@/content/privacy-policy";

export type LegalProseSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type SiteLegalSettings = {
  legalForm: string;
  publicationDirector: string;
  mentionsSections: LegalProseSection[];
  privacySections: PrivacySection[];
  privacyUpdatedLabel: string;
};

export const defaultSiteLegalSettings: SiteLegalSettings = {
  legalForm: "Société à responsabilité limitée (SARL) ou équivalent",
  publicationDirector: "Le directeur de la publication est le représentant légal de SD CREATIV.",
  mentionsSections: [
    {
      id: "propriete",
      title: "Propriété intellectuelle",
      paragraphs: [
        "L'ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, sons, logiciels) est la propriété exclusive de SD CREATIV ou de ses partenaires, sauf mention contraire. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable.",
      ],
    },
    {
      id: "donnees",
      title: "Données personnelles",
      paragraphs: [
        "Pour toute information relative à la collecte et au traitement de vos données personnelles, consultez notre politique de confidentialité.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      paragraphs: [
        "Ce site utilise des cookies pour améliorer l'expérience utilisateur et mesurer l'audience. Vous pouvez gérer vos préférences via la bannière cookies ou notre politique de confidentialité.",
      ],
    },
    {
      id: "responsabilite",
      title: "Limitation de responsabilité",
      paragraphs: [
        "SD CREATIV s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, elle ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition. En conséquence, SD CREATIV décline toute responsabilité pour tout préjudice résultant d'une erreur ou d'une omission.",
      ],
    },
  ],
  privacySections: privacyPolicySections.map((s) => ({
    ...s,
    bullets: s.bullets ? [...s.bullets] : undefined,
    paragraphs: s.paragraphs ? [...s.paragraphs] : undefined,
    dataCategories: s.dataCategories?.map((d) => ({ ...d })),
    subprocessors: s.subprocessors?.map((p) => ({ ...p })),
  })),
  privacyUpdatedLabel: "Dernière mise à jour",
};
