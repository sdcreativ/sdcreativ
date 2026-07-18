/**
 * Ancien seed d’avis Google (données de démonstration).
 * Non utilisé sur le site public — voir GoogleReviewsSection (CTA uniquement).
 * Conservé pour types éventuels / import admin legacy.
 */
export type GoogleReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

export const googleReviewsProfile = {
  rating: 0,
  reviewCount: 0,
  label: "Avis Google",
} as const;

export const googleReviews: GoogleReview[] = [];
