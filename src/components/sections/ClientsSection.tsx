import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getRealisations } from "@/lib/cms";
import { uniqueSectorsFromRealisations } from "@/lib/portfolio-public-stats";
import { getTechnologyPartners } from "@/lib/public-partners-resolver";

export async function ClientsSection() {
  const [items, partners] = await Promise.all([
    getRealisations(),
    getTechnologyPartners("fr"),
  ]);

  const sectors = uniqueSectorsFromRealisations(items);
  const labels =
    sectors.length > 0 ? sectors : partners.map((partner) => partner.name).filter(Boolean);

  if (labels.length === 0) return null;

  return (
    <AnimatedSection className="border-y border-gray/40 bg-gray-light/30 py-14 md:py-16">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Confiance"
          title="Ils nous font"
          highlight="confiance"
          align="center"
          className="mb-10"
        />
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-text">
          {sectors.length > 0
            ? "Des secteurs variés nous confient leur présence digitale."
            : "Des technologies et partenaires de confiance pour vos projets."}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {labels.map((label) => (
            <li
              key={label}
              className="rounded-full border border-gray/60 bg-white px-5 py-2.5 text-sm font-medium text-foreground/80 shadow-sm"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  );
}
