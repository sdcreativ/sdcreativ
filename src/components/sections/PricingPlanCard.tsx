import { Check } from "lucide-react";
import type { PricingPlan } from "@/content/pricing";
import { Button } from "@/components/ui/Button";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { resolvePlanPriceDisplay } from "@/lib/pricing-display";
import { cn } from "@/lib/utils";

type Props = {
  plan: PricingPlan;
  locale?: "fr" | "en";
  className?: string;
};

/**
 * Carte formule — partagée entre le site public (PricingSection) et l'aperçu admin.
 * Composant sans état ni hook : utilisable côté serveur comme côté client.
 */
export function PricingPlanCard({ plan, locale = "fr", className }: Props) {
  const accent = plan.variant === "accent";
  const price = resolvePlanPriceDisplay(plan, locale);
  const perks = plan.perks.filter((perk) => perk.isVisible);
  const badge = plan.highlighted ? plan.badgeLabel?.trim() : "";
  const tone = accent ? "text-accent" : "text-primary";
  // Petit texte sur fond teinté : rouge foncé pour tenir 4.5:1 (WCAG AA).
  const perkTone = accent ? "text-accent-dark" : "text-primary";
  const tintBg = accent ? "bg-accent/5" : "bg-primary-light";
  const discountLabel = price.kind === "amount" && price.compareAt ? plan.discountLabel?.trim() : "";
  const en = locale === "en";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border border-gray/60 border-t-4 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8",
        accent ? "border-t-accent" : "border-t-primary",
        plan.highlighted && (accent ? "shadow-md ring-2 ring-accent/20" : "shadow-md ring-2 ring-primary/20"),
        className,
      )}
    >
      {badge && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-semibold text-white",
            accent ? "bg-accent" : "bg-primary",
          )}
        >
          {badge}
        </span>
      )}

      <h3 className="break-words text-2xl font-extrabold uppercase tracking-tight text-foreground">{plan.name}</h3>
      <p className="mt-1 text-gray-text">{plan.tagline}</p>

      <div className="mt-5">
        {price.kind === "amount" ? (
          <>
            {(price.prefix || discountLabel) && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-gray-text">
                {price.prefix}
                {discountLabel && (
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tintBg, perkTone)}>
                    {discountLabel}
                  </span>
                )}
              </p>
            )}
            {price.compareAt && (
              <p className="text-lg font-semibold text-gray-text">
                <span className="sr-only">{en ? "Regular price: " : "Prix sans remise : "}</span>
                <del>
                  {price.compareAt} {plan.currencyLabel || plan.currencyCode}
                </del>
              </p>
            )}
            <p className="flex flex-wrap items-baseline gap-x-2">
              {price.compareAt && <span className="sr-only">{en ? "Discounted price: " : "Prix remisé : "}</span>}
              <span className={cn("text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl", tone)}>
                {price.amount}
              </span>
              {price.suffix && <span className="text-sm font-medium text-gray-text">{price.suffix}</span>}
            </p>
            {price.note && <p className="mt-1 text-sm text-gray-text">{price.note}</p>}
          </>
        ) : (
          <p className={cn("text-base font-semibold", tone)}>{price.label}</p>
        )}
      </div>

      {perks.length > 0 && (
        <ul className={cn("mt-6 space-y-4 rounded-xl p-4", tintBg)}>
          {perks.map((perk) => {
            const Icon = getLucideIcon(perk.icon);
            return (
              <li key={perk.id} className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-6 w-6 shrink-0", tone)} aria-hidden />
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold leading-snug", perkTone)}>
                    {perk.href ? (
                      <a
                        href={perk.href}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="underline decoration-1 underline-offset-2 hover:decoration-2"
                      >
                        {perk.title}
                      </a>
                    ) : (
                      perk.title
                    )}
                  </p>
                  {perk.detail && <p className="mt-0.5 text-xs leading-snug text-gray-text">{perk.detail}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ul className="mt-6 flex-1 space-y-3 border-t border-gray/60 pt-6">
        {plan.features.map((feature, index) => (
          <li key={`${index}-${feature}`} className="flex items-start gap-3 text-sm">
            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
            <span className="min-w-0 break-words">{feature}</span>
          </li>
        ))}
      </ul>

      <Button href={plan.ctaHref} variant={accent ? "accent" : "primary"} className="mt-8 w-full justify-center">
        {plan.ctaLabel}
      </Button>
    </div>
  );
}
