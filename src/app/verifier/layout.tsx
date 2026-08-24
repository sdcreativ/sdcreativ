import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Vérification de document",
  description: "Vérification d'authenticité d'un devis ou d'une facture SD CREATIV.",
  path: "/verifier",
  noIndex: true,
});

export default function VerifierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
