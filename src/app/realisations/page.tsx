import { SitePageHero } from "@/components/ui/SitePageHero";
import { RealisationsGrid } from "@/components/realisations/RealisationsGrid";
import { getRealisations } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";
import { buildPortfolioPublicStats } from "@/lib/portfolio-public-stats";

export const metadata = createMetadata({
  title: "Réalisations",
  description:
    "Découvrez nos projets web réalisés en Europe et à l'international : sites vitrines, e-commerce, refontes et optimisations SEO pour PME et entrepreneurs.",
  path: "/realisations",
});

export default async function RealisationsPage() {
  const items = await getRealisations();
  const stats = buildPortfolioPublicStats(items);
  return (
    <>
      <SitePageHero pageKey="realisations" />

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <RealisationsGrid items={items} stats={stats} />
        </div>
      </section>
    </>
  );
}
