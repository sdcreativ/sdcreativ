"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isActiveEnglishPath } from "@/i18n/routes";

export function OfflinePageContent() {
  const pathname = usePathname() ?? "/";
  const en = isActiveEnglishPath(pathname);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <WifiOff className="mb-6 h-16 w-16 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold text-foreground">
        {en ? "You are offline" : "Vous êtes hors ligne"}
      </h1>
      <p className="mt-3 max-w-md text-gray-text">
        {en
          ? "Check your internet connection and try again. Some pages may still be available once loaded."
          : "Vérifiez votre connexion internet et réessayez. Certaines pages peuvent rester disponibles une fois chargées."}
      </p>
      <Button href={en ? "/en" : "/"} className="mt-8">
        {en ? "Back to home" : "Retour à l'accueil"}
      </Button>
      <p className="mt-4 text-sm text-gray-text">
        <Link
          href={en ? "/en/contact" : "/contact"}
          className="text-primary hover:underline"
        >
          {en ? "Contact us →" : "Nous contacter →"}
        </Link>
      </p>
    </div>
  );
}
