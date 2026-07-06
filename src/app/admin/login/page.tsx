import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminLoginView } from "@/components/admin/AdminLoginView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion CRM",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center gap-2 bg-[#eef2f7] text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      }
    >
      <AdminLoginView />
    </Suspense>
  );
}
