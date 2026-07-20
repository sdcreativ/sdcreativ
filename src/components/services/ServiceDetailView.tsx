import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { AccordionItem } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { RealisationCard } from "@/components/realisations/RealisationCard";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import type { ServiceDetail } from "@/content/service-details";
import { getRealisation } from "@/lib/cms";
import type { ResolvedService } from "@/lib/public-services-types";
import { buildWhatsappUrl } from "@/lib/site-public-resolver";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";

type Props = {
  service: ResolvedService;
  detail: ServiceDetail;
};

export async function ServiceDetailView({ service, detail }: Props) {
  let waUrl = "https://wa.me/22500000000?text=Bonjour";
  try {
    const { contact } = await getSitePublicSettings();
    waUrl = buildWhatsappUrl(contact);
  } catch (error) {
    console.error("[ServiceDetailView] site public settings:", error);
  }
  const Icon = service.icon ?? HelpCircle;
  const relatedIds = Array.isArray(detail.relatedRealisationIds)
    ? detail.relatedRealisationIds
    : [];
  const deliverables = Array.isArray(detail.deliverables) ? detail.deliverables : [];
  const process = Array.isArray(detail.process) ? detail.process : [];
  const idealFor = Array.isArray(detail.idealFor) ? detail.idealFor : [];
  const faq = Array.isArray(detail.faq) ? detail.faq : [];
  const relatedProjects = (
    await Promise.all(relatedIds.map((id) => getRealisation(id)))
  ).filter((project): project is NonNullable<typeof project> => Boolean(project));
  const serviceImageSrc = service.image
    ? resolveImageDisplayUrl(service.image)
    : undefined;

  return (
    <>
      {faq.length > 0 && <FaqJsonLd items={faq} />}
      <PageHero
        eyebrow="Nos services"
        title={service.title}
        description={detail.heroDescription}
        backgroundImage={service.image}
        backgroundAlt={service.imageAlt ?? service.title}
        breadcrumb={[
          { label: "Accueil", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
      />

      <section className="border-b border-gray/40 bg-white py-10 md:py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/50 px-4 py-2 text-sm font-semibold text-primary">
              <Wallet className="h-4 w-4" aria-hidden />À partir de{" "}
              {detail.startingFrom || "sur devis"}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray/60 bg-gray-light px-4 py-2 text-sm font-medium text-foreground/80">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              Délai indicatif : {detail.delay || "selon projet"}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16 md:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              {detail.problem?.title || "Votre besoin"}
            </h2>
            <p className="mt-4 leading-relaxed text-gray-text">
              {detail.problem?.text || service.description}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary-light/30 p-6 md:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {detail.solution?.title || service.title}
            </h2>
            <p className="mt-3 leading-relaxed text-gray-text">
              {detail.solution?.text || detail.heroDescription}
            </p>
          </div>
        </div>
      </section>

      {serviceImageSrc && (
        <section className="border-y border-gray/40 bg-gray-light py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-lg">
              <div className="relative aspect-[16/9]">
                <Image
                  src={serviceImageSrc}
                  alt={service.imageAlt ?? service.title}
                  fill
                  unoptimized={isProxiedMediaUrl(serviceImageSrc)}
                  sizes="(max-width: 1280px) 100vw, 1200px"
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {deliverables.length > 0 && (
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
            Ce qui est inclus
          </h2>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
            {deliverables.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-gray/60 bg-white p-4 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm leading-relaxed text-foreground/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}

      {process.length > 0 && (
      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
            Notre processus en {process.length} étapes
          </h2>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-4">
            {process.map(({ step, title, description }) => (
              <li
                key={step}
                className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
              >
                <span className="font-mono text-sm font-bold text-primary">{step}</span>
                <h3 className="mt-2 font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-text">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      )}

      {idealFor.length > 0 && (
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
            Idéal pour
          </h2>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {idealFor.map((item) => (
              <li
                key={item}
                className="rounded-full border border-gray/60 bg-gray-light px-4 py-2 text-sm font-medium text-foreground/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}

      {relatedProjects.length > 0 && (
        <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
              Réalisations associées
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {relatedProjects.map((project, i) =>
                project ? (
                  <RealisationCard key={project.id} project={project} index={i} />
                ) : null,
              )}
            </div>
          </div>
        </section>
      )}

      {faq.length > 0 && (
      <section className="border-t border-gray/40 py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {faq.map((item) => (
              <AccordionItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="bg-dark py-16 md:py-20">
        <div className="container mx-auto max-w-2xl px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Lancez votre projet {service.title.toLowerCase()}
          </h2>
          <p className="mt-4 text-white/70">
            Estimation en ligne ou échange direct avec notre équipe — réponse sous 24 à 48 h.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href={`/devis?type=${detail.id}`} size="lg">
              Estimer mon projet
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              href="/contact"
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Nous écrire
            </Button>
            <Button href={waUrl} external variant="whatsapp" size="lg">
              <MessageCircle className="h-4 w-4 text-green-400" aria-hidden />
              WhatsApp
            </Button>
          </div>
          <Link
            href="/services"
            className="mt-8 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
            Tous nos services
          </Link>
        </div>
      </section>
    </>
  );
}
