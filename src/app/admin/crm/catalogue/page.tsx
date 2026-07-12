import { Suspense } from "react";
import { CrmServiceCatalogView } from "@/components/admin/CrmServiceCatalogView";
import { Loader2 } from "lucide-react";

export default function CrmServiceCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement du catalogue…
        </div>
      }
    >
      <CrmServiceCatalogView />
    </Suspense>
  );
}
