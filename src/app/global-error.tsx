"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 text-center text-white">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-3 max-w-md text-white/70">
          Nous avons été notifiés et travaillons à la résolution. Réessayez ou
          contactez-nous.
        </p>
        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white"
          >
            Réessayer
          </button>
          <Button href="/contact" variant="outline">
            Contact
          </Button>
        </div>
      </body>
    </html>
  );
}
