import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Offre promotionnelle",
  description: "Confirmation d'intérêt pour une offre SD CREATIV.",
  path: "/promo",
  noIndex: true,
});

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
