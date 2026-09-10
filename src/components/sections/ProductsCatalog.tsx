import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AnimatedCard, AnimatedSection } from "@/components/ui/AnimatedSection";
import type { HouseProduct } from "@/content/products";
import { cn } from "@/lib/utils";

type Props = {
  products: HouseProduct[];
  moreTitle: string;
  moreDescription: string;
  moreCta: string;
  moreHref: string;
};

export function ProductsCatalog({
  products,
  moreTitle,
  moreDescription,
  moreCta,
  moreHref,
}: Props) {
  return (
    <>
      <AnimatedSection className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {products.map((product, index) => (
              <AnimatedCard
                key={product.id}
                delay={index * 0.06}
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm md:p-8",
                  product.featured
                    ? "border-primary/30 ring-1 ring-primary/15"
                    : "border-gray/60",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {product.category}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-foreground">{product.name}</h2>
                <p className="mt-2 text-base font-semibold text-foreground/90">{product.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-text">{product.description}</p>
                <ul className="mt-6 flex-1 space-y-2">
                  {product.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-foreground/85">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href={product.href}>{product.cta}</Button>
                  {product.secondaryHref && product.secondaryCta ? (
                    <Button href={product.secondaryHref} variant="ghost">
                      {product.secondaryCta}
                    </Button>
                  ) : null}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <section className="border-t border-gray/40 bg-primary-light py-16">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">{moreTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80">{moreDescription}</p>
          <Button href={moreHref} className="mt-6">
            {moreCta}
          </Button>
        </div>
      </section>
    </>
  );
}
