import { PageHero } from "@/components/ui/PageHero";
import { FaqSection } from "@/components/sections/FaqSection";
import { Button } from "@/components/ui/Button";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { faqItems } from "@/content/faq";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "FAQ — Questions fréquentes",
  description:
    "Réponses aux questions les plus fréquentes sur nos services web, tarifs en FCFA, délais de livraison et accompagnement à Abidjan.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <FaqJsonLd items={faqItems} />
      <PageHero
        eyebrow="Support"
        title="Questions"
        highlight="fréquentes"
        description="Tout ce que vous devez savoir avant de lancer votre projet web avec SD CREATIV."
      />
      <FaqSection />
      <section className="border-t border-gray/40 bg-primary-light py-16">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Vous ne trouvez pas votre réponse ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80">
            Notre équipe est disponible pour répondre à toutes vos questions et
            vous proposer un devis personnalisé gratuit.
          </p>
          <Button href="/contact" className="mt-6">
            Nous contacter
          </Button>
        </div>
      </section>
    </>
  );
}
