import { Suspense } from "react";
import { EspaceClientPortal } from "@/components/espace-client/EspaceClientPortal";
import { createMetadata } from "@/lib/metadata";
import { Loader2 } from "lucide-react";

export const metadata = createMetadata({
  title: "Espace client",
  description:
    "Espace client SD CREATIV — suivez votre projet, consultez vos documents et échangez avec notre équipe.",
  path: "/espace-client",
  noIndex: true,
});

function PortalFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-[#eef2f7] text-sm text-gray-text">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      Chargement…
    </div>
  );
}

export default function EspaceClientPage() {
  return (
    <Suspense fallback={<PortalFallback />}>
      <EspaceClientPortal />
    </Suspense>
  );
}
