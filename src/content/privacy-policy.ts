export type PrivacySubprocessor = {
  name: string;
  role: string;
};

export type PrivacyDataCategory = {
  label: string;
  details: string;
};

export type PrivacySection = {
  id: string;
  title: string;
  intro?: string;
  bullets?: string[];
  paragraphs?: string[];
  dataCategories?: PrivacyDataCategory[];
  subprocessors?: PrivacySubprocessor[];
  footer?: string;
};

export const privacyPolicySections: PrivacySection[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    paragraphs: ["__CONTACT_BLOCK__"],
  },
  {
    id: "donnees",
    title: "Données collectées",
    intro: "Selon les formulaires et services utilisés, nous pouvons collecter :",
    dataCategories: [
      { label: "Contact & devis", details: "nom, email, téléphone, entreprise, type de projet, budget, délai, message" },
      { label: "Newsletter", details: "adresse email" },
      { label: "Candidatures", details: "identité, coordonnées, parcours, motivation, liens CV/LinkedIn" },
      { label: "Assistant IA (chat)", details: "contenu des messages échangés (temporaire, session navigateur)" },
      {
        label: "Chat & appels 3CX (si activé)",
        details:
          "identité et coordonnées fournies dans le widget, contenu des messages Live Chat, métadonnées d'appel (horodatage, durée, numéro si fourni)",
      },
      {
        label: "Enregistrement audio / chat 3CX (si activé)",
        details:
          "lorsque l'enregistrement est activé sur le PBX, la conversation ou l'appel peut être enregistré à des fins de qualité et de formation ; une mention est alors affichée dans le widget (« conversation peut être enregistrée »)",
      },
      { label: "Navigation", details: "données techniques (IP, navigateur, pages visitées) via cookies analytiques, avec consentement" },
    ],
  },
  {
    id: "finalites",
    title: "Finalités du traitement",
    bullets: [
      "Répondre à vos demandes de contact, devis et candidatures",
      "Vous envoyer notre newsletter (avec consentement explicite)",
      "Assurer le suivi commercial et la relation client",
      "Fournir l'assistant conversationnel du site",
      "Assurer le chat en direct et les appels audio via 3CX (relation commerciale / support)",
      "Mesurer l'audience et améliorer le site (cookies analytiques, avec consentement)",
      "Assurer la sécurité et la maintenance technique",
    ],
  },
  {
    id: "base-legale",
    title: "Base légale",
    bullets: [
      "Consentement : newsletter, cookies analytiques, chat IA",
      "Exécution de mesures précontractuelles : demandes de devis, contact, chat et appels initiés via le site",
      "Intérêt légitime : sécurité du site, amélioration des services, suivi commercial, journalisation des interactions",
    ],
  },
  {
    id: "sous-traitants",
    title: "Destinataires et sous-traitants",
    intro: "Vos données peuvent être traitées par les prestataires suivants, dans le cadre de leurs missions :",
    subprocessors: [
      { name: "Resend", role: "envoi d'emails transactionnels (contact, devis, newsletter)" },
      { name: "Google Analytics", role: "mesure d'audience (uniquement après acceptation des cookies)" },
      { name: "Sentry", role: "monitoring des erreurs techniques (données anonymisées)" },
      { name: "OpenAI", role: "assistant IA du site (messages du chat, si activé)" },
      {
        name: "3CX",
        role: "téléphonie IP, Live Chat et communications navigateur (si le widget / les appels sont activés) — DPA / conditions de sous-traitance de l'éditeur 3CX (offre Hosted)",
      },
      { name: "Hébergeur", role: "stockage et diffusion du site (VPS / cloud)" },
    ],
    footer:
      "Ces prestataires sont sélectionnés pour leur conformité aux standards de sécurité. Certains peuvent être situés hors de Côte d'Ivoire ; des garanties appropriées sont mises en place (clauses contractuelles types, DPA hébergeur 3CX, etc.).",
  },
  {
    id: "conservation",
    title: "Durée de conservation",
    bullets: [
      "Demandes contact / devis : 3 ans à compter du dernier échange",
      "Newsletter : jusqu'à désinscription ou 3 ans d'inactivité",
      "Candidatures : 2 ans maximum",
      "Messages chat IA : durée de la session navigateur (non stockés en base)",
      "Conversations / appels 3CX (PBX) : selon la politique de conservation de l'instance Hosted 3CX",
      "Journaux CRM communication_events (métadonnées chat/appel, sans enregistrement audio) : max. 3 ans après le dernier échange commercial, sauf obligation légale",
      "Enregistrements audio/vidéo 3CX (si activés) : durée définie dans la console 3CX, proportionnée à la finalité qualité / formation",
      "Logs techniques : 12 mois maximum",
    ],
  },
  {
    id: "droits",
    title: "Vos droits",
    intro: "Conformément au RGPD et à la loi ivoirienne de 2013, vous disposez des droits suivants :",
    bullets: [
      "Droit d'accès, de rectification et d'effacement",
      "Droit à la limitation et à l'opposition du traitement",
      "Droit à la portabilité de vos données",
      "Droit de retirer votre consentement à tout moment (newsletter, cookies)",
    ],
    footer: "__RIGHTS_CONTACT__",
  },
  {
    id: "cookies",
    title: "Cookies",
    intro:
      "Ce site utilise des cookies strictement nécessaires à son fonctionnement et, avec votre consentement, des cookies analytiques pour mesurer l'audience.",
    bullets: [
      "Cookies essentiels : mémorisation de vos préférences cookies (sdcreativ-cookie-consent)",
      "Cookies analytiques : Google Analytics 4 (optionnels, chargés après acceptation)",
      "Cookies / stockage local du widget 3CX (si activé) : nécessaires au fonctionnement du chat et de l'appel audio dans le navigateur ; déposés lors de l'ouverture du widget",
    ],
    footer:
      "Vous pouvez accepter ou refuser les cookies via le bandeau affiché lors de votre première visite. Vous pouvez également configurer votre navigateur pour refuser les cookies. L'utilisation du chat ou de l'appel 3CX implique le dépôt des cookies techniques du prestataire pour assurer la communication.",
  },
  {
    id: "securite",
    title: "Sécurité",
    paragraphs: [
      "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées (chiffrement HTTPS, headers de sécurité, accès restreints, validation des formulaires) pour protéger vos données contre tout accès non autorisé, perte ou destruction.",
    ],
  },
  {
    id: "modifications",
    title: "Modifications",
    paragraphs: [
      "Cette politique peut être mise à jour. La date de dernière mise à jour est indiquée en haut de page. Nous vous invitons à la consulter régulièrement.",
    ],
  },
];

export const privacyPolicyToc = privacyPolicySections.map(({ id, title }) => ({
  id,
  title,
}));
