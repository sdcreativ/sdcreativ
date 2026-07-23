import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getTechnologyPartners } from "@/lib/public-partners-resolver";

type Props = { locale?: "fr" | "en" };

export async function PartnersSection({ locale = "fr" }: Props) {
  const technologyPartners = await getTechnologyPartners(locale);
  if (technologyPartners.length === 0) {
    const fallback = locale === "en" ? await getTechnologyPartners("fr") : [];
    if (fallback.length === 0) return null;
    return renderPartners(fallback, locale);
  }
  return renderPartners(technologyPartners, locale);
}

function renderPartners(
  technologyPartners: Awaited<ReturnType<typeof getTechnologyPartners>>,
  locale: "fr" | "en",
) {
  const isEn = locale === "en";

  return (
    <AnimatedSection className="border-y border-gray/40 bg-white py-14 md:py-16">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isEn ? "Technology & partners" : "Technologies & partenaires"}
          title={isEn ? "Trusted" : "Des outils"}
          highlight={isEn ? "tools" : "de confiance"}
          align="center"
          className="mb-10"
        />
        <ul className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {technologyPartners.map((partner) => (
            <li
              key={partner.name}
              className="rounded-xl border border-gray/60 bg-gray-light/40 px-5 py-3 text-center shadow-sm"
            >
              <span className="block text-sm font-bold text-foreground">{partner.name}</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-gray-text">
                {partner.category}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  );
}
