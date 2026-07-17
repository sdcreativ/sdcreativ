import Image from "next/image";
import {
  ArrowRight,
  Check,
  ChevronDown,
  HeadphonesIcon,
  Monitor,
  Search,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSiteHeroSettings } from "@/lib/site-hero-settings";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";

const highlightIcons = [Monitor, Search, Smartphone, HeadphonesIcon];

export async function HeroSection() {
  const hero = await getSiteHeroSettings();
  const backgroundSrc = resolveImageDisplayUrl(hero.backgroundImage);

  return (
    <section className="relative overflow-hidden bg-dark pt-[4.5rem] md:pt-[4.75rem]">
      <Image
        src={backgroundSrc}
        alt=""
        fill
        priority
        unoptimized={isProxiedMediaUrl(backgroundSrc)}
        className="object-cover object-[center_40%]"
        sizes="100vw"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#0a1628]/62" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/82 via-[#0a1628]/55 to-[#0a1628]/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_45%,rgba(0,114,181,0.22),transparent_55%)]" />

      <div className="container relative mx-auto px-4 py-14 md:px-6 md:py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 xl:gap-16">
          <div className="max-w-2xl animate-fade-up">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary-light md:text-sm">
              {hero.eyebrow}
            </p>
            <h1 className="text-[1.65rem] font-bold uppercase leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.65rem] lg:text-5xl">
              {hero.titleBefore}{" "}
              <span className="text-[#5eb3f0]">{hero.titleHighlight}</span>
              {hero.titleAfter}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
              {hero.description}
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 md:gap-x-6">
              {hero.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                  <Check className="h-4 w-4 shrink-0 text-[#5eb3f0]" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href={hero.ctaPrimaryHref} size="lg" className="shadow-[0_4px_20px_rgba(0,114,181,0.45)]">
                {hero.ctaPrimaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button href={hero.ctaSecondaryHref} variant="outline" size="lg">
                {hero.ctaSecondaryLabel}
                <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="hidden animate-fade-up flex-col gap-3 [animation-delay:120ms] lg:flex lg:max-w-sm lg:justify-self-end xl:mr-6">
            {hero.highlights.map((item, i) => {
              const Icon = highlightIcons[i] ?? Monitor;
              return (
                <div
                  key={`${item.label}-${i}`}
                  className="flex items-center gap-3.5 rounded-xl border border-white/12 bg-[#0a1628]/58 px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/8">
                    <Icon className="h-5 w-5 text-[#5eb3f0]" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-snug text-white/55">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
          {hero.highlights.map((item, i) => {
            const Icon = highlightIcons[i] ?? Monitor;
            return (
              <div
                key={`mobile-${item.label}-${i}`}
                className="rounded-xl border border-white/12 bg-[#0a1628]/58 p-3 backdrop-blur-md"
              >
                <Icon className="mb-2 h-5 w-5 text-[#5eb3f0]" aria-hidden />
                <p className="text-xs font-semibold text-white">{item.label}</p>
                <p className="mt-0.5 hidden text-[10px] leading-snug text-white/55 sm:block">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
