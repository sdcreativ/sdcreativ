import { SitePageHero } from "@/components/ui/SitePageHero";
import { PricingSection } from "@/components/sections/PricingSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { BookAppointment } from "@/components/booking/BookAppointment";
import { Button } from "@/components/ui/Button";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Tarifs & Offres",
  description:
    "Découvrez nos formules Essentiel, Professionnel et Business — des offres adaptées à chaque étape de votre croissance digitale.",
  path: "/tarifs",
});

export default function TarifsPage() {
  return (
    <>
      <SitePageHero pageKey="tarifs" />
      <PricingSection />
      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-2 md:items-center md:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Estimez ou planifiez votre projet
            </h2>
            <p className="mt-4 text-gray-text">
              Utilisez notre configurateur pour une estimation instantanée en FCFA, ou
              réservez un appel de 30 minutes avec notre équipe.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href="/devis">Configurateur de devis</Button>
              <BookAppointment variant="inline" />
            </div>
          </div>
          <BookAppointment />
        </div>
      </section>
      <FaqSection />
    </>
  );
}
