import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formationsPageCopyEn } from "@/content/formations";
import { getFormationsContent } from "@/lib/formations-resolver";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { enTraining } from "@/i18n/en-content";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Professional training",
  description:
    "SD CREATIV training catalog: web & mobile development, AI, cybersecurity, DevOps, databases, digital marketing and more. Abidjan and remote.",
  path: "/en/training",
  locale: "en",
});

export default async function EnTrainingPage() {
  const content = await getFormationsContent();

  return (
    <>
      <PageHero
        eyebrow={formationsPageCopyEn.hero.eyebrow}
        title={enTraining.title}
        highlight={enTraining.highlight}
        description={enTraining.description}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Training" }]}
      />

      <section className="border-b border-gray/40 bg-primary-light py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6 lg:px-8">
          <p className="text-gray-text">{formationsPageCopyEn.intro}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/en/contact" size="lg">
              {enTraining.cta}
            </Button>
            <Button href="/formations" variant="ghost" size="lg">
              {enTraining.viewFr}
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Catalog"
            title="Training"
            highlight="domains"
            description="Each card opens the full French detail page with modules, pricing and pedagogy."
            className="mb-12"
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {content.categories.map((category, i) => {
              const Icon = category.icon;
              const imageSrc = resolveImageDisplayUrl(category.image);
              return (
                <Link
                  key={category.id}
                  href={`/formations/${category.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-dark shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-xl"
                >
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <Image
                      src={imageSrc}
                      alt={category.imageAlt || category.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority={i < 3}
                      unoptimized={isProxiedMediaUrl(imageSrc)}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-dark via-dark/55 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm ring-1 ring-white/25">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary-light">
                        {category.courses.length} modules
                      </p>
                      <h2 className="mt-1 text-lg font-bold leading-snug text-white md:text-xl">
                        {category.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-white/75">
                        {category.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                        View details
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-dark py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Need a tailored training plan?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Tell us your goals, audience and timeline — we build the right program.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/en/contact" size="lg">
              {enTraining.cta}
            </Button>
            <Button href="/en/book" variant="outline" size="lg">
              Book a call
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
