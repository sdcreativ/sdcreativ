import { PageHero } from "@/components/ui/PageHero";
import { RealisationsGrid } from "@/components/realisations/RealisationsGrid";
import { getRealisations } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Réalisations",
  description:
    "Découvrez nos projets web réalisés en Europe et à l'international : sites vitrines, e-commerce, refontes et optimisations SEO pour PME et entrepreneurs.",
  path: "/realisations",
});

export default async function RealisationsPage() {
  const items = await getRealisations();
  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Nos"
        highlight="réalisations"
        description="Des projets concrets, pensés pour la performance, la conversion et l'image de marque de nos clients."
      />

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <RealisationsGrid items={items} />
        </div>
      </section>
    </>
  );
}
