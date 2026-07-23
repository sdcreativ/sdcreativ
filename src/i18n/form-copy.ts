import { contactSubjectOptions } from "@/content/contact-options";

export type FormLocale = "fr" | "en";

const contactSubjectsEn: Record<(typeof contactSubjectOptions)[number]["value"], string> = {
  "question-generale": "General question",
  support: "Support & assistance",
  facturation: "Billing & admin",
  audit: "Free audit request",
  partenariat: "Partnership",
  autre: "Other",
};

export function getContactSubjectOptions(locale: FormLocale) {
  return contactSubjectOptions.map((option) => ({
    value: option.value,
    label: locale === "en" ? contactSubjectsEn[option.value] : option.label,
  }));
}

export const contactFormCopy = {
  fr: {
    successTitle: "Message envoyé !",
    successBody:
      "Merci pour votre message. Notre équipe vous répond sous 24 à 48 heures ouvrées.",
    successAgain: "Envoyer un autre message",
    title: "Nous écrire",
    subtitle:
      "Posez votre question ou décrivez votre besoin — nous vous répondons personnellement sous 24 à 48 h.",
    quoteHint: "Besoin d'une estimation chiffrée en FCFA ?",
    quoteLink: "Utilisez le configurateur de devis →",
    quoteHref: "/devis",
    name: "Nom complet",
    email: "Email",
    phone: "Téléphone",
    company: "Entreprise",
    subject: "Sujet",
    subjectPlaceholder: "Choisissez un sujet",
    message: "Votre message",
    namePh: "Jean Dupont",
    emailPh: "vous@entreprise.com",
    phonePh: "+225 07 00 00 00 00",
    companyPh: "Nom de votre société",
    messagePh: "Décrivez votre question ou votre demande...",
    privacyPrefix: "En soumettant ce formulaire, vous acceptez notre",
    privacyLink: "politique de confidentialité",
    privacyHref: "/politique-confidentialite",
    submit: "Envoyer mon message",
    submitting: "Envoi en cours...",
    errorFallback: "Une erreur est survenue.",
  },
  en: {
    successTitle: "Message sent!",
    successBody:
      "Thank you for your message. Our team will reply within 24–48 business hours.",
    successAgain: "Send another message",
    title: "Write to us",
    subtitle:
      "Ask a question or describe your need — we reply personally within 24–48 business hours.",
    quoteHint: "Need a project estimate?",
    quoteLink: "Use the online quote builder →",
    quoteHref: "/en/devis",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    subject: "Subject",
    subjectPlaceholder: "Choose a subject",
    message: "Your message",
    namePh: "Jane Smith",
    emailPh: "you@company.com",
    phonePh: "+225 07 00 00 00 00",
    companyPh: "Your company name",
    messagePh: "Describe your question or request...",
    privacyPrefix: "By submitting this form, you agree to our",
    privacyLink: "privacy policy",
    privacyHref: "/en/privacy",
    submit: "Send my message",
    submitting: "Sending...",
    errorFallback: "Something went wrong.",
  },
} as const;

export const quoteFormCopy = {
  fr: {
    successTitle: "Demande envoyée !",
    successBody:
      "Votre estimation a été transmise à notre équipe. Nous vous recontactons sous 24 à 48 heures avec un devis personnalisé.",
    successAgain: "Faire une nouvelle estimation",
    projectType: "Type de projet",
    pages: "Nombre de pages",
    addons: "Options supplémentaires",
    details: "Vos coordonnées",
    name: "Nom complet *",
    email: "Email *",
    phone: "Téléphone",
    company: "Entreprise",
    budget: "Budget indicatif *",
    timeline: "Délai souhaité *",
    message: "Précisions (optionnel)",
    choose: "Choisir...",
    namePh: "Jean Dupont",
    emailPh: "vous@entreprise.com",
    companyPh: "Nom de votre société",
    messagePh: "Décrivez brièvement votre projet...",
    privacyPrefix: "En soumettant ce formulaire, vous acceptez notre",
    privacyLink: "politique de confidentialité",
    privacyHref: "/politique-confidentialite",
    privacySuffix: ". Vos données servent uniquement à établir votre devis.",
    submit: "Recevoir mon devis personnalisé",
    submitting: "Envoi en cours...",
    summaryTitle: "Votre configuration",
    summaryPrice: "Devis personnalisé gratuit",
    summaryHint:
      "Nous calculons un montant adapté à votre contexte (périmètre, délais, contraintes).",
    errorFallback: "Une erreur est survenue.",
  },
  en: {
    successTitle: "Request sent!",
    successBody:
      "Your request was sent to our team. We will get back to you within 24–48 hours with a personalized quote.",
    successAgain: "Start a new estimate",
    projectType: "Project type",
    pages: "Number of pages",
    addons: "Additional options",
    details: "Your details",
    name: "Full name *",
    email: "Email *",
    phone: "Phone",
    company: "Company",
    budget: "Indicative budget *",
    timeline: "Desired timeline *",
    message: "Notes (optional)",
    choose: "Choose...",
    namePh: "Jane Smith",
    emailPh: "you@company.com",
    companyPh: "Your company name",
    messagePh: "Briefly describe your project...",
    privacyPrefix: "By submitting this form, you agree to our",
    privacyLink: "privacy policy",
    privacyHref: "/en/privacy",
    privacySuffix: ". Your data is used only to prepare your quote.",
    submit: "Get my personalized quote",
    submitting: "Sending...",
    summaryTitle: "Your configuration",
    summaryPrice: "Free custom quote",
    summaryHint: "We will price your project based on scope, timeline and constraints.",
    errorFallback: "Something went wrong.",
  },
} as const;

export const budgetOptionsEn = [
  { value: "moins-500k", label: "Under 500,000 FCFA" },
  { value: "500k-1m", label: "500,000 – 1,000,000 FCFA" },
  { value: "1m-2m", label: "1,000,000 – 2,000,000 FCFA" },
  { value: "2m-5m", label: "2,000,000 – 5,000,000 FCFA" },
  { value: "plus-5m", label: "Over 5,000,000 FCFA" },
  { value: "inconnu", label: "Not sure yet" },
] as const;

export const timelineOptionsEn = [
  { value: "urgent", label: "Urgent (under 1 month)" },
  { value: "1-2-mois", label: "1 to 2 months" },
  { value: "2-3-mois", label: "2 to 3 months" },
  { value: "3-plus", label: "More than 3 months" },
  { value: "flexible", label: "Flexible / to be defined" },
] as const;
