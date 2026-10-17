import { Suspense } from "react";
import { CrmKadyKnowledgeView } from "@/components/admin/CrmKadyKnowledgeView";

export default function AdminSiteKadyKnowledgePage() {
  return (
    <Suspense>
      <CrmKadyKnowledgeView />
    </Suspense>
  );
}
