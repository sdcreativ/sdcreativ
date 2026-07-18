import { PageHero } from "@/components/ui/PageHero";
import { RealisationsGrid } from "@/components/realisations/RealisationsGrid";
import { getRealisations } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";
import { buildPortfolioPublicStats } from "@/lib/portfolio-public-stats";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Portfolio",
  description: "Web projects delivered for businesses in Europe and internationally.",
  path: "/en/portfolio",
  locale: "en",
});

export default async function EnPortfolioPage() {
  let items = await getRealisations("en");
  if (items.length === 0) {
    items = await getRealisations("fr");
  }
  const stats = buildPortfolioPublicStats(items);

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Our work"
        description="Showcase websites, e-commerce and digital products."
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Portfolio" }]}
      />
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <RealisationsGrid items={items} stats={stats} />
        </div>
      </section>
    </>
  );
}
