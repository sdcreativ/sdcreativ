import { PageHero } from "@/components/ui/PageHero";
import { RealisationsGrid } from "@/components/realisations/RealisationsGrid";
import { listPublicRealisations, toRealisation } from "@/lib/public-realisations";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Portfolio",
  description: "Web projects delivered for businesses in Europe and internationally.",
  path: "/en/portfolio",
  locale: "en",
});

export default async function EnPortfolioPage() {
  const records = await listPublicRealisations({ locale: "en", visibleOnly: true });
  const items = records.length > 0 ? records.map(toRealisation) : undefined;

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
          <RealisationsGrid items={items} />
        </div>
      </section>
    </>
  );
}
