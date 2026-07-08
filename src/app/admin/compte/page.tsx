import { Suspense } from "react";
import { AdminAccountView } from "@/components/admin/AdminAccountView";

export default function AdminAccountPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Chargement…</div>}>
      <AdminAccountView />
    </Suspense>
  );
}
