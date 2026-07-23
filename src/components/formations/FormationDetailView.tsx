import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  MessageCircle,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { AccordionItem } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedCard, AnimatedSection } from "@/components/ui/AnimatedSection";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import {
  getFormationPriceFrom,
  type ResolvedFormationCategory,
} from "@/lib/formations-resolver";
import { formatFcfa, formatPriceFrom, PRICE_ON_REQUEST_LABEL } from "@/lib/format";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { buildWhatsappUrl } from "@/lib/site-public-resolver";
import { getSitePublicSettings } from "@/lib/site-public-settings";

type Props = {
  category: ResolvedFormationCategory;
  related: ResolvedFormationCategory[];
};

export async function FormationDetailView({ category, related }: Props) {
  const { contact } = await getSitePublicSettings();
  const waUrl = buildWhatsappUrl(contact);
  const { detail } = category;
  const Icon = category.icon;
  const imageSrc = resolveImageDisplayUrl(category.image);
  const priceFrom = getFormationPriceFrom(category);
  const faqItems = detail.faq.length
    ? detail.faq
    : [
        {
          question: "Comment obtenir un devis pour cette formation ?",
          answer:
            "Indiquez le domaine, le nombre de participants et le format souhaité via le devis ou un rendez-vous. Réponse sous 24 à 48 heures.",
        },
      ];

  return (
    <>
      <FaqJsonLd items={faqItems} />
      <PageHero
        eyebrow={category.isServices ? "Accompagnement" : "Formation"}
        title={category.title}
        description={detail.heroDescription}
        backgroundImage={category.image}
        backgroundAlt={category.imageAlt || category.title}
        breadcrumb={[
          { label: "Accueil", href: "/" },
          { label: "Formations", href: "/formations" },
          { label: category.title },
        ]}
      />

      <section className="border-b border-gray/40 bg-white py-10 md:py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {priceFrom != null && (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/50 px-4 py-2 text-sm font-semibold text-primary">
                <Wallet className="h-4 w-4" aria-hidden />
                {formatPriceFrom(priceFrom)}
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-gray/60 bg-gray-light px-4 py-2 text-sm font-medium text-foreground/80">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              {detail.durationSummary}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray/60 bg-gray-light px-4 py-2 text-sm font-medium text-foreground/80">
              <GraduationCap className="h-4 w-4 text-primary" aria-hidden />
              {detail.level}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray/60 bg-gray-light px-4 py-2 text-sm font-medium text-foreground/80">
              <Layers className="h-4 w-4 text-primary" aria-hidden />
              {detail.format}
            </div>
          </div>
        </div>
      </section>

      <AnimatedSection className="py-16 md:py-20">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16 md:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Le programme
            </p>
            <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
              Une formation concrète, orientée résultats
            </h2>
            <p className="mt-4 leading-relaxed text-gray-text">{category.description}</p>
            <p className="mt-4 leading-relaxed text-gray-text">{detail.heroDescription}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/devis" size="lg">
                Demander un devis
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button href="/rendez-vous" variant="ghost" size="lg">
                Prendre rendez-vous
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-lg">
            <div className="relative aspect-[4/3]">
              <Image
                src={imageSrc}
                alt={category.imageAlt || category.title}
                fill
                unoptimized={isProxiedMediaUrl(imageSrc)}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="border-y border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm">
              <Users className="h-7 w-7 text-primary" aria-hidden />
              <h3 className="mt-4 font-bold text-foreground">Public cible</h3>
              <ul className="mt-4 space-y-2">
                {detail.audience.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-gray-text">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm md:col-span-2">
              <Target className="h-7 w-7 text-primary" aria-hidden />
              <h3 className="mt-4 font-bold text-foreground">Objectifs pédagogiques</h3>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {detail.objectives.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-gray-text">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {category.isServices ? "Nos services" : "Modules proposés"}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
              {category.isServices
                ? "Ce que nous pouvons faire pour vous"
                : "Composez votre parcours"}
            </h2>
            <p className="mt-3 text-gray-text">
              Durées et tarifs indicatifs par participant — devis personnalisé selon le format et
              le nombre de stagiaires.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2">
            {category.courses.map((course, i) => (
              <AnimatedCard
                key={course.title}
                delay={Math.min(i * 0.04, 0.24)}
                className="flex flex-col rounded-2xl border border-gray/60 bg-gray-light/40 p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground">{course.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-text">
                      {course.duration ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
                          {course.duration}
                        </span>
                      ) : null}
                      {course.price != null && course.price > 0 ? (
                        <span className="font-semibold text-primary">
                          {formatFcfa(course.price)} FCFA
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-text">
                          {PRICE_ON_REQUEST_LABEL}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-2 md:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Prérequis</h2>
            <ul className="mt-6 space-y-3">
              {detail.prerequisites.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-gray/60 bg-white p-4 text-sm text-foreground/85 shadow-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">À l&apos;issue de la formation</h2>
            <ul className="mt-6 space-y-3">
              {detail.outcomes.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-gray/60 bg-white p-4 text-sm text-foreground/85 shadow-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
            Notre méthode
          </h2>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
            {detail.methodology.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-gray/60 bg-gray-light/40 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm leading-relaxed text-foreground/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </AnimatedSection>

      {detail.process.length > 0 && (
        <AnimatedSection className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Déroulement en {detail.process.length} étapes
            </h2>
            <ol className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-4">
              {detail.process.map((step) => (
                <li
                  key={step.step}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {step.step}
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </AnimatedSection>
      )}

      <section className="border-t border-gray/40 bg-white py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-8">
            {faqItems.map((item) => (
              <AccordionItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Autres domaines
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => {
                const RelIcon = item.icon;
                const relSrc = resolveImageDisplayUrl(item.image);
                return (
                  <Link
                    key={item.id}
                    href={`/formations/${item.id}`}
                    className="group overflow-hidden rounded-2xl border border-gray/60 bg-white shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={relSrc}
                        alt={item.imageAlt || item.title}
                        fill
                        unoptimized={isProxiedMediaUrl(relSrc)}
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                          <RelIcon className="h-4 w-4" aria-hidden />
                        </div>
                        <p className="font-bold text-white">{item.title}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="bg-dark py-16 md:py-20">
        <div className="container mx-auto max-w-2xl px-4 text-center md:px-6 lg:px-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
            <Icon className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Prêt à lancer « {category.title} » ?
          </h2>
          <p className="mt-4 text-white/70">
            Devis personnalisé ou échange avec notre équipe — réponse sous 24 à 48 heures.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis" size="lg">
              Demander un devis
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button href="/rendez-vous" variant="outline" size="lg">
              Prendre rendez-vous
            </Button>
            <Button href={waUrl} external variant="whatsapp" size="lg">
              <MessageCircle className="h-4 w-4 text-green-400" aria-hidden />
              WhatsApp
            </Button>
          </div>
          <Link
            href="/formations"
            className="mt-8 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
            Toutes les formations
          </Link>
        </div>
      </section>
    </>
  );
}
