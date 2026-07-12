import { Suspense } from "react";
import { CrmBillingHubView } from "@/components/admin/CrmBillingHubView";

export default function CrmInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <CrmBillingHubView />
    </Suspense>
  );
}
