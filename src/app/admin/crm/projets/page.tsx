import { Suspense } from "react";
import { CrmProjectsView } from "@/components/admin/CrmProjectsView";
import { Loader2 } from "lucide-react";

export default function CrmProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      }
    >
      <CrmProjectsView />
    </Suspense>
  );
}
