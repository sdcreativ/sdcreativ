import { Suspense } from "react";
import { CrmDocumentationView } from "@/components/admin/CrmDocumentationView";
import { Loader2 } from "lucide-react";

export default function CrmDocumentationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        </div>
      }
    >
      <CrmDocumentationView />
    </Suspense>
  );
}
