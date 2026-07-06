import { EspaceClientPortal } from "@/components/espace-client/EspaceClientPortal";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Espace client",
  description:
    "Espace client SD CREATIV — suivez votre projet, consultez vos documents et échangez avec notre équipe.",
  path: "/espace-client",
  noIndex: true,
});

export default function EspaceClientPage() {
  return <EspaceClientPortal />;
}
