import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et gestion des cookies du site SD CREATIV — protection de vos données personnelles (RGPD).",
  path: "/politique-confidentialite",
});

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <PageHero
        eyebrow="Protection des données"
        title="Politique de"
        highlight="confidentialité"
        description="Transparence sur la collecte, l'utilisation et la protection de vos données personnelles."
      />

      <PrivacyPolicyContent />

      <section className="border-t border-gray/40 bg-primary-light py-14 md:py-16">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Une question sur vos données ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80">
            Notre équipe vous répond sous 48 h ouvrées pour toute demande d&apos;accès,
            rectification ou suppression.
          </p>
          <Button href="/contact" className="mt-6">
            Nous contacter
          </Button>
        </div>
      </section>
    </>
  );
}
