export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
};

export const testimonials: Testimonial[] = [
  {
    id: "1",
    quote:
      "SD CREATIV a créé notre site en moins de 3 semaines. Nos clients nous trouvent sur Google et commandent directement via WhatsApp. Un vrai plus pour notre activité à Cocody.",
    author: "Aminata Diabaté",
    role: "Gérante",
    company: "Pâtisserie Douceur — Cocody, Abidjan",
  },
  {
    id: "2",
    quote:
      "Professionnels, à l'écoute et disponibles. Notre boutique en ligne accepte Orange Money et Wave — exactement ce qu'il nous fallait pour vendre à Abidjan et en province.",
    author: "Ibrahim Koné",
    role: "Directeur",
    company: "ETS Koné Électro — Treichville, Abidjan",
  },
  {
    id: "3",
    quote:
      "La refonte de notre site a modernisé notre image auprès des entreprises. Les demandes de rendez-vous arrivent maintenant en ligne, même le week-end.",
    author: "Me Hélène Martin",
    role: "Associée fondatrice",
    company: "Cabinet H-Conseil Expertise — Bruxelles, Belgique",
  },
];
