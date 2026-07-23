import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Quote,
  TrendingUp,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { RealisationCard } from "@/components/realisations/RealisationCard";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { RealisationJsonLd } from "@/components/seo/RealisationJsonLd";
import { getRealisation, getRelatedRealisations, getRealisations } from "@/lib/cms";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { buildWhatsappUrl } from "@/lib/site-public-resolver";
import { createMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

/** CMS + settings publics (cache taggé) — ISR 5 min. */
export const revalidate = 300;


export async function generateStaticParams() {
  const items = await getRealisations();
  return items.map((r) => ({ slug: r.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = await getRealisation(slug);
  if (!project) return {};

  return createMetadata({
    title: project.title,
    description: project.description,
    path: `/realisations/${slug}`,
  });
}

export default async function RealisationDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getRealisation(slug);

  if (!project) notFound();

  const related = await getRelatedRealisations(slug, project.category);
  const { contact } = await getSitePublicSettings();
  const waUrl = buildWhatsappUrl(contact);

  const breadcrumbItems = [
    { label: "Accueil", href: "/" },
    { label: "Réalisations", href: "/realisations" },
    { label: project.title },
  ];

  return (
    <>
      <RealisationJsonLd project={project} />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      {/* Hero */}
      <header className="bg-dark pt-28 pb-12 md:pt-32">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <Breadcrumb className="mb-6" items={breadcrumbItems} />

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${project.accent}25`, color: project.accent }}
            >
              {project.category}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {project.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {project.year}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {project.duration}
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {project.title}
          </h1>
          <p className="mt-2 text-lg text-white/60">
            {project.client} · {project.sector}
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
            {project.description}
          </p>

          {project.metric && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-primary-light" aria-hidden />
              <span className="font-bold text-white">{project.metric.value}</span>
              <span className="text-sm text-white/60">{project.metric.label}</span>
            </div>
          )}
        </div>
      </header>

      {/* Captures desktop + mobile */}
      <section className="border-b border-gray bg-gray-light py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="overflow-hidden rounded-2xl border border-gray bg-white shadow-xl">
              <Image
                src={project.image}
                alt={`${project.imageAlt} — version desktop`}
                width={1440}
                height={900}
                className="h-auto w-full object-cover object-top"
                priority
              />
            </div>
            <div className="mx-auto w-48 shrink-0 lg:mx-0">
              <div className="rounded-[2rem] border-4 border-dark bg-dark p-2 shadow-2xl">
                <div className="overflow-hidden rounded-[1.5rem]">
                  <Image
                    src={project.image}
                    alt={`${project.imageAlt} — version mobile`}
                    width={390}
                    height={844}
                    className="aspect-[9/19] w-full object-cover object-top"
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-gray-text">Vue mobile</p>
            </div>
          </div>
        </div>
      </section>

      {/* Étude de cas */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground md:text-3xl">
            Étude de cas
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { title: "Problématique", content: project.caseStudy.challenge, color: "border-accent/30 bg-accent/5" },
              { title: "Solution", content: project.caseStudy.solution, color: "border-primary/30 bg-primary-light/50" },
              { title: "Résultats", content: null, color: "border-green-200 bg-green-50", list: project.caseStudy.results },
            ].map((block) => (
              <div
                key={block.title}
                className={`rounded-2xl border p-6 md:p-8 ${block.color}`}
              >
                <h3 className="text-lg font-bold text-foreground">{block.title}</h3>
                {block.list ? (
                  <ul className="mt-4 space-y-3">
                    {block.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-foreground/80">{block.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avant / Après */}
      {project.beforeAfter && (
        <section className="border-y border-gray bg-gray-light py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-foreground">
              Avant / Après
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-gray bg-white p-8">
                <span className="text-xs font-bold uppercase tracking-widest text-accent">
                  Avant
                </span>
                <p className="mt-4 leading-relaxed text-gray-text">
                  {project.beforeAfter.beforeLabel}
                </p>
                <div className="relative mt-6 aspect-video overflow-hidden rounded-xl bg-gray">
                  <Image
                    src={project.image}
                    alt="Avant refonte"
                    fill
                    className="object-cover object-top grayscale opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-dark/30">
                    <span className="rounded-full bg-accent px-4 py-1 text-sm font-semibold text-white">
                      Ancien site
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-white p-8 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Après
                </span>
                <p className="mt-4 leading-relaxed text-gray-text">
                  {project.beforeAfter.afterLabel}
                </p>
                <div className="relative mt-6 aspect-video overflow-hidden rounded-xl">
                  <Image
                    src={project.image}
                    alt="Après refonte"
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stack technique */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Stack technique</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-gray bg-gray-light px-4 py-2 text-sm font-medium text-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignage client */}
      {project.testimonial && (
        <section className="bg-dark py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center md:px-6 lg:px-8">
            <Quote className="mx-auto h-10 w-10 text-primary-light/40" aria-hidden />
            <blockquote className="mt-6 text-xl italic leading-relaxed text-white/90 md:text-2xl">
              &ldquo;{project.testimonial.quote}&rdquo;
            </blockquote>
            <footer className="mt-6">
              <cite className="not-italic">
                <span className="font-bold text-white">{project.testimonial.author}</span>
                <span className="text-white/60"> — {project.testimonial.role}</span>
              </cite>
            </footer>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-2xl px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Un projet similaire en tête ?
          </h2>
          <p className="mt-3 text-gray-text">
            Discutons de votre activité et construisons ensemble votre succès digital.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis" size="lg">
              Demander un devis
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button href={waUrl} external variant="whatsapp" size="lg">
              <MessageCircle className="h-4 w-4 text-green-400" aria-hidden />
              WhatsApp
            </Button>
          </div>
          <Link
            href="/realisations"
            className="mt-8 inline-flex items-center gap-2 text-sm text-gray-text transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour aux réalisations
          </Link>
        </div>
      </section>

      {/* Projets similaires */}
      {related.length > 0 && (
        <section className="border-t border-gray bg-gray-light py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-foreground">
              Projets similaires
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {related.map((p, i) => (
                <RealisationCard key={p.id} project={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
