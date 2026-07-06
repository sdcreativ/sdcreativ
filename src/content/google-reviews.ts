export type GoogleReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

/** Renseignez NEXT_PUBLIC_GOOGLE_REVIEW_URL avec votre lien Google Business */
/** Données de démonstration — la section avis Google n’est affichée que si NEXT_PUBLIC_GOOGLE_REVIEW_URL est renseigné. */
export const googleReviewsProfile = {
  rating: 4.9,
  reviewCount: 28,
  label: "Avis Google",
} as const;

export const googleReviews: GoogleReview[] = [
  {
    id: "gr-1",
    author: "Aminata Diabaté",
    rating: 5,
    date: "2026-04-12",
    text: "Équipe réactive et professionnelle. Notre site a été livré dans les délais et nous avons plus de demandes depuis.",
  },
  {
    id: "gr-2",
    author: "Ibrahim Koné",
    rating: 5,
    date: "2026-03-08",
    text: "Excellent accompagnement pour notre boutique en ligne. Paiement Mobile Money bien intégré. Je recommande SD CREATIV.",
  },
  {
    id: "gr-3",
    author: "Me Hélène Martin",
    rating: 5,
    date: "2026-02-20",
    text: "Refonte soignée, site rapide et moderne. Parfait pour une clientèle professionnelle en Belgique.",
  },
];
