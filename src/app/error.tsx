"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
        Erreur
      </p>
      <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
        Une erreur est survenue
      </h1>
      <p className="mt-4 max-w-md text-gray-text">
        Nous sommes désolés, quelque chose s&apos;est mal passé. Vous pouvez
        réessayer ou retourner à l&apos;accueil.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Réessayer</Button>
        <Button href="/" variant="ghost">
          Retour à l&apos;accueil
        </Button>
      </div>
      <Link
        href="/contact"
        className="mt-6 text-sm text-primary hover:underline"
      >
        Contacter le support
      </Link>
    </div>
  );
}
