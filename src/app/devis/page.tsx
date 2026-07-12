import { Suspense } from "react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { QuoteConfigurator } from "@/components/forms/QuoteConfigurator";
import { BookAppointment } from "@/components/booking/BookAppointment";
import { Button } from "@/components/ui/Button";
import { createMetadata } from "@/lib/metadata";
import { getQuoteConfig } from "@/lib/quote-config-resolver";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Devis en ligne",
  description:
    "Estimez le coût de votre projet web en FCFA : site vitrine, e-commerce, agents IA, mobile et plus. Recevez une estimation par email.",
  path: "/devis",
});

export default async function DevisPage() {
  const config = await getQuoteConfig();

  return (
    <>
      <SitePageHero pageKey="devis" />

      <section className="bg-gray-light py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <Suspense fallback={<p className="text-center text-gray-text">Chargement…</p>}>
            <QuoteConfigurator config={config} />
          </Suspense>
        </div>
      </section>

      <section className="border-t border-gray/40 bg-white py-16">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-2 md:px-6 lg:px-8">
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-foreground">
              Besoin d&apos;échanger en direct ?
            </h2>
            <p className="mt-3 text-gray-text">
              Réservez un créneau de 30 minutes avec notre équipe pour affiner votre
              projet et obtenir un devis personnalisé.
            </p>
            <Button href="/contact" variant="ghost" className="mt-4 w-fit">
              Nous écrire via le formulaire de contact →
            </Button>
          </div>
          <BookAppointment />
        </div>
      </section>
    </>
  );
}
