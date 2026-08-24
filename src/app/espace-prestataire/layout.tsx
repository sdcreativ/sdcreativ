import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Espace prestataire",
  description: "Espace réservé aux prestataires SD CREATIV.",
  path: "/espace-prestataire",
  noIndex: true,
});

export default function EspacePrestataireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
