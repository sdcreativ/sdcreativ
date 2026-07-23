import Image from "next/image";
import { cn } from "@/lib/utils";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

type Crumb = { label: string; href?: string };

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  backgroundImage?: string;
  backgroundAlt?: string;
  breadcrumb?: Crumb[];
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  backgroundImage,
  backgroundAlt = "",
  breadcrumb,
  className,
}: PageHeroProps) {
  const backgroundSrc = backgroundImage
    ? resolveImageDisplayUrl(backgroundImage)
    : null;
  const imageAlt =
    backgroundAlt.trim() ||
    [title, highlight].filter(Boolean).join(" — ").trim() ||
    "SD CREATIV";

  return (
    <>
      {breadcrumb && breadcrumb.length > 0 && <BreadcrumbJsonLd items={breadcrumb} />}
      <section
      className={cn(
        "relative overflow-hidden bg-dark pt-28 pb-16 md:pt-32 md:pb-20",
        className,
      )}
    >
      {backgroundSrc ? (
        <>
          <Image
            src={backgroundSrc}
            alt={imageAlt}
            fill
            priority
            unoptimized={isProxiedMediaUrl(backgroundSrc)}
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-dark/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,114,181,0.2),_transparent_60%)]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,114,181,0.12),_transparent_60%)]" />
      )}
      <div className="container relative mx-auto px-4 text-center md:px-6 lg:px-8">
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb items={breadcrumb} className="mb-6 text-left" />
        )}
        {eyebrow && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary-light">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
          {title}
          {highlight && (
            <>
              {" "}
              <span className="text-primary-light">{highlight}</span>
            </>
          )}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">{description}</p>
        )}
      </div>
    </section>
    </>
  );
}
