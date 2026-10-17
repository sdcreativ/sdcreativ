import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CrmConversationsView } from "@/components/admin/CrmConversationsView";

export default function CrmConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      }
    >
      <CrmConversationsView />
    </Suspense>
  );
}
