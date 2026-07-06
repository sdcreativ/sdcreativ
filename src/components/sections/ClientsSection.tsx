import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { clientSectors } from "@/content/clients";

export function ClientsSection() {
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
          PME, entrepreneurs et organisations en Côte d&apos;Ivoire et à
          l&apos;international nous confient leur présence digitale.
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {clientSectors.map((sector) => (
            <li
              key={sector}
              className="rounded-full border border-gray/60 bg-white px-5 py-2.5 text-sm font-medium text-foreground/80 shadow-sm"
            >
              {sector}
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  );
}
