import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Hors ligne",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <WifiOff className="mb-6 h-16 w-16 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold text-foreground">Vous êtes hors ligne</h1>
      <p className="mt-3 max-w-md text-gray-text">
        Vérifiez votre connexion internet et réessayez. Certaines pages peuvent
        rester disponibles une fois chargées.
      </p>
      <Button href="/" className="mt-8">
        Retour à l&apos;accueil
      </Button>
      <p className="mt-4 text-sm text-gray-text">
        <Link href="/contact" className="text-primary hover:underline">
          Nous contacter →
        </Link>
      </p>
    </div>
  );
}
