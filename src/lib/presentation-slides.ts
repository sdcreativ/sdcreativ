import type { PresentationSlide, PresentationTrack } from "@/lib/presentation-types";

const CAP = (name: string) => `/presentation/captures/${name}`;

export const SALON_SLIDES: PresentationSlide[] = [
  {
    id: "S1",
    image: CAP("CAP-01-hero-accueil.png"),
    title: "Accroche SD CREATIV",
    oralHint: "Agence web Abidjan — site moderne, visible, orienté clients.",
  },
  {
    id: "S2",
    image: CAP("CAP-02-pourquoi-sd-creativ.png"),
    title: "Le problème client",
    oralHint: "Invisible sur Google/WhatsApp — le site comme commercial 24h/24.",
  },
  {
    id: "S3",
    image: CAP("CAP-03-1-services.png"),
    title: "Nos services",
    oralHint: "Vitrine, e-commerce, SEO — modulable selon le budget.",
  },
  {
    id: "S4a",
    image: CAP("CAP-05-1-realisations.png"),
    title: "Réalisations — portfolio",
    oralHint: "Projets livrés en Afrique et en Europe.",
  },
  {
    id: "S4b",
    image: CAP("CAP-06-mode-elegance-ecommerce.png"),
    title: "Mode Élégance — e-commerce",
    oralHint: "Boutique Dakar, desktop + mobile.",
  },
  {
    id: "S5a",
    image: CAP("CAP-09-temoignages.png"),
    title: "Témoignages clients",
    oralHint: "Aminata, Ibrahim, Hélène — preuve sociale.",
  },
  {
    id: "S5b",
    image: CAP("CAP-07-clients-secteurs.png"),
    title: "Secteurs accompagnés",
    oralHint: "PME, commerce, restauration, santé, immobilier…",
  },
  {
    id: "S6",
    image: CAP("CAP-14-tarifs-offres.png"),
    title: "Formules & tarifs",
    oralHint: "Essentiel / Pro / Business — estimation FCFA.",
  },
  {
    id: "S7",
    image: CAP("S7-cta-configurateur.png"),
    title: "Passage à l'action",
    oralHint: "Proposer le configurateur de projet.",
  },
];

export const BUREAU_SLIDES: PresentationSlide[] = [
  {
    id: "L1",
    image: CAP("CAP-01-hero-accueil.png"),
    title: "Accroche & promesse",
  },
  {
    id: "L2",
    image: CAP("CAP-02-pourquoi-sd-creativ.png"),
    title: "Contexte client",
    oralHint: "Question : comment vos clients vous trouvent-ils ?",
  },
  {
    id: "L3a",
    image: CAP("CAP-03-1-services.png"),
    title: "Services — vitrine, e-commerce, refonte",
  },
  {
    id: "L3b",
    image: CAP("CAP-03-2-services.png"),
    title: "Services — identité, SEO, IA…",
  },
  {
    id: "L3c",
    image: CAP("CAP-03-3-services.png"),
    title: "Services — cloud, mobile, sur mesure",
  },
  {
    id: "L5",
    image: CAP("CAP-02-pourquoi-sd-creativ.png"),
    title: "Pourquoi SD CREATIV",
    oralHint: "4 cartes : accessibilité, qualité, accompagnement, performance.",
  },
  {
    id: "L6",
    image: CAP("CAP-14-tarifs-offres.png"),
    title: "Méthode & réassurance",
    oralHint: "Bandeau délai / support — oral 7 étapes.",
  },
  {
    id: "L7a",
    image: CAP("CAP-05-1-realisations.png"),
    title: "Portfolio — grille 1",
  },
  {
    id: "L7b",
    image: CAP("CAP-05-2-realisations.png"),
    title: "Portfolio — grille 2",
  },
  {
    id: "L7c",
    image: CAP("CAP-06-2-horizon-conseil.png"),
    title: "Horizon Conseil — B2B",
    oralHint: "Branching conseil / corporate.",
  },
  {
    id: "L8",
    image: CAP("CAP-07-clients-secteurs.png"),
    title: "Secteurs clients",
  },
  {
    id: "L9",
    image: CAP("CAP-09-temoignages.png"),
    title: "Témoignages",
  },
  {
    id: "L12",
    image: CAP("CAP-14-tarifs-offres.png"),
    title: "Tarifs détaillés",
  },
  {
    id: "L15",
    image: CAP("S7-cta-configurateur.png"),
    title: "Configuration projet",
  },
];

export function getSlidesForTrack(track: PresentationTrack): PresentationSlide[] {
  return track === "salon" ? SALON_SLIDES : BUREAU_SLIDES;
}

export const PRESENTATION_LOCATION_LABELS: Record<
  import("@/lib/presentation-types").PresentationLocation,
  string
> = {
  salon: "Salon / foire",
  bureau_client: "Bureau client",
  bureau_sdcreativ: "Bureau SD CREATIV",
  visio: "Visioconférence",
  autre: "Autre",
};
