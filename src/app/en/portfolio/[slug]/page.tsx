import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { getRealisation, getRealisations, getRelatedRealisations } from "@/lib/cms";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { createMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const items = await getRealisations("en");
  return items.map((r) => ({ slug: r.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = await getRealisation(slug, "en");
  if (!project) return {};

  return createMetadata({
    title: project.title,
    description: project.description,
    path: `/en/portfolio/${slug}`,
    locale: "en",
  });
}

export default async function EnPortfolioDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getRealisation(slug, "en");

  if (!project) notFound();

  const related = await getRelatedRealisations(slug, project.category, 3, "en");
  const imageSrc = resolveImageDisplayUrl(project.image);

  return (
    <>
      <PageHero
        eyebrow={project.category}
        title={project.title}
        description={project.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Portfolio", href: "/en/portfolio" },
          { label: project.title },
        ]}
      />
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <Link
            href="/en/portfolio"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to portfolio
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-dark">
              <Image
                src={imageSrc}
                alt={project.imageAlt || project.title}
                fill
                unoptimized={isProxiedMediaUrl(imageSrc)}
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
            </div>
            <aside className="space-y-4 rounded-2xl border border-gray/60 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-text">
                <span className="font-semibold text-foreground">{project.client}</span>
                {" · "}
                {project.sector}
              </p>
              <ul className="space-y-2 text-sm text-gray-text">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden />
                  {project.location}
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" aria-hidden />
                  {project.year}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" aria-hidden />
                  {project.duration}
                </li>
              </ul>
              {project.metric ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                  {project.metric.value} {project.metric.label}
                </p>
              ) : null}
              <Button href="/en/devis" className="w-full justify-center">
                Start a similar project
              </Button>
            </aside>
          </div>

          {(project.caseStudy?.results?.length ?? 0) > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-foreground">Results</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {project.caseStudy.results.map((result) => (
                  <li key={result} className="flex gap-2 text-sm text-gray-text">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {result}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="mb-6 text-2xl font-bold text-foreground">Related work</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/en/portfolio/${item.id}`}
                    className="rounded-xl border border-gray/60 bg-white p-5 shadow-sm transition hover:border-primary/30"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {item.category}
                    </p>
                    <p className="mt-2 font-bold text-foreground">{item.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
