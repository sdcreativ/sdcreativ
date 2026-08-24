import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Espace équipe",
  description: "Espace réservé aux collaborateurs SD CREATIV.",
  path: "/espace-equipe",
  noIndex: true,
});

export default function EspaceEquipeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
