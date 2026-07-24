import { PageHero } from "@/components/ui/PageHero";
import { CmsLocaleEmpty } from "@/components/ui/CmsLocaleEmpty";
import { RealisationsGrid } from "@/components/realisations/RealisationsGrid";
import { getRealisations } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";
import { buildPortfolioPublicStats } from "@/lib/portfolio-public-stats";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Portfolio",
  description: "Web projects delivered for businesses in Europe and internationally.",
  path: "/en/portfolio",
  locale: "en",
});

export default async function EnPortfolioPage() {
  const items = await getRealisations("en");
  const stats = buildPortfolioPublicStats(items, "en");

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
          {items.length === 0 ? (
            <CmsLocaleEmpty
              title="English case studies coming soon"
              description="We are publishing English portfolio entries in the CMS. Meanwhile, request a free custom quote or contact the team — or browse the French portfolio."
            />
          ) : (
            <RealisationsGrid items={items} stats={stats} locale="en" />
          )}
        </div>
      </section>
    </>
  );
}
