import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { ServiceHubGrid } from "@/components/services/ServiceHubGrid";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Services",
  description:
    "Sites vitrines, e-commerce, applications mobiles, agents IA, automatisation, DevOps, cloud, SEO local, identité visuelle et maintenance — des solutions digitales complètes pour votre activité.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <SitePageHero pageKey="services" />

      <section className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <ServiceHubGrid />
        </div>
      </section>

      <section className="border-t border-gray/40 bg-primary-light py-14 md:py-16">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Vous ne savez pas quelle offre choisir ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80">
            Décrivez votre projet : nous vous orientons vers la solution la plus adaptée et
            vous envoyons un devis personnalisé.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis" size="lg">
              Estimer mon projet
            </Button>
            <Button href="/contact" variant="ghost" size="lg">
              Nous contacter
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
