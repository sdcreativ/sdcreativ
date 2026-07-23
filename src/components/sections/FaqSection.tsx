import { HelpCircle } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AccordionItem } from "@/components/ui/Accordion";
import type { FaqItem } from "@/content/faq";
import { getFaqItems } from "@/lib/public-faq-resolver";

type Props = {
  items?: FaqItem[];
  locale?: "fr" | "en";
};

export async function FaqSection({ items, locale = "fr" }: Props) {
  const faqItems = items ?? (await getFaqItems(locale));
  if (faqItems.length === 0) return null;

  const leftColumn = faqItems.filter((_, i) => i % 2 === 0);
  const rightColumn = faqItems.filter((_, i) => i % 2 === 1);

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="faq">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={locale === "en" ? "FAQ" : "Questions fréquentes"}
          title={locale === "en" ? "Got" : "Vous avez des"}
          highlight={locale === "en" ? "questions?" : "questions ?"}
          className="mb-14"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-12">
          <div>
            {leftColumn.map((item, i) => (
              <AccordionItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                defaultOpen={i === 0}
              />
            ))}
          </div>

          <div className="hidden items-start justify-center pt-8 lg:flex">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-light">
              <HelpCircle className="h-12 w-12 text-primary" aria-hidden />
            </div>
          </div>

          <div>
            {rightColumn.map((item) => (
              <AccordionItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
