import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getRealisations } from "@/lib/cms";
import { uniqueSectorsFromRealisations } from "@/lib/portfolio-public-stats";
import { getTechnologyPartners } from "@/lib/public-partners-resolver";

type Props = { locale?: "fr" | "en" };

export async function ClientsSection({ locale = "fr" }: Props) {
  const [items, partners] = await Promise.all([
    getRealisations(locale),
    getTechnologyPartners(locale),
  ]);

  const sectors = uniqueSectorsFromRealisations(items);
  const labels =
    sectors.length > 0 ? sectors : partners.map((partner) => partner.name).filter(Boolean);

  if (labels.length === 0) return null;

  const isEn = locale === "en";

  return (
    <AnimatedSection className="border-y border-gray/40 bg-gray-light/30 py-14 md:py-16">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isEn ? "Trust" : "Confiance"}
          title={isEn ? "They trust" : "Ils nous font"}
          highlight={isEn ? "us" : "confiance"}
          align="center"
          className="mb-10"
        />
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-text">
          {sectors.length > 0
            ? isEn
              ? "Organizations across industries entrust us with their digital presence."
              : "Des secteurs variés nous confient leur présence digitale."
            : isEn
              ? "Trusted technologies and partners for your projects."
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
