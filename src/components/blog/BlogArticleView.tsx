import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calendar, Clock, User } from "lucide-react";
import { BlogComments } from "@/components/blog/BlogComments";
import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { BlogReadingProgress } from "@/components/blog/BlogReadingProgress";
import { BlogShareLinks } from "@/components/blog/BlogShareLinks";
import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import type { BlogPost } from "@/content/blog";
import { SITE } from "@/lib/constants";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { prepareBlogContentHtml } from "@/lib/blog-toc";
import { cn } from "@/lib/utils";

type Props = {
  post: BlogPost;
  related?: BlogPost[];
  locale?: "fr" | "en";
  showComments?: boolean;
};

export function BlogArticleView({
  post,
  related = [],
  locale = "fr",
  showComments = true,
}: Props) {
  const isEn = locale === "en";
  const coverSrc = post.coverImage
    ? resolveImageDisplayUrl(post.coverImage)
    : null;

  const path = isEn ? `/en/blog/${post.slug}` : `/blog/${post.slug}`;
  const shareUrl = `${SITE.url}${path}`;

  const { html: contentHtml, headings } = prepareBlogContentHtml(
    post.contentHtml?.trim() ? post.contentHtml : "",
  );

  const dateLabel = new Date(post.date).toLocaleDateString(
    isEn ? "en-GB" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const breadcrumb = isEn
    ? [
        { label: "Home", href: "/en" },
        { label: "Blog", href: "/en/blog" },
        { label: post.title },
      ]
    : [
        { label: "Accueil", href: "/" },
        { label: "Blog", href: "/blog" },
        { label: post.title },
      ];

  const copy = isEn
    ? {
        read: "read",
        ctaTitle: "Planning a web project?",
        ctaBody:
          "Tell us about your goals — we reply within 24–48 hours with a clear next step.",
        ctaButton: "Get a quote",
        ctaHref: "/en/devis",
        relatedTitle: "Keep reading",
        relatedAll: "All articles",
        relatedAllHref: "/en/blog",
      }
    : {
        read: "de lecture",
        ctaTitle: "Un projet web en tête ?",
        ctaBody:
          "Parlez-nous de vos objectifs — réponse sous 24 à 48 h avec une prochaine étape claire.",
        ctaButton: "Demander un devis",
        ctaHref: "/devis",
        relatedTitle: "À lire ensuite",
        relatedAll: "Tous les articles",
        relatedAllHref: "/blog",
      };

  const hasToc = headings.length >= 2;

  return (
    <article data-blog-article>
      <BlogReadingProgress />

      <header className="relative isolate overflow-hidden bg-dark pt-28 md:pt-32">
        {coverSrc ? (
          <>
            <Image
              src={coverSrc}
              alt={post.title}
              fill
              priority
              unoptimized={isProxiedMediaUrl(coverSrc) || coverSrc.startsWith("http")}
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-linear-to-b from-dark/85 via-dark/75 to-dark" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,114,181,0.28),transparent_55%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,114,181,0.18),transparent_55%)]" />
        )}

        <div className="container relative mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-8 lg:pb-24">
          <Breadcrumb items={breadcrumb} className="mb-8" locale={locale} />

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-light">
              {post.category}
            </p>
            <h1 className="mt-4 text-balance text-3xl font-bold leading-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/70 md:text-lg">
                {post.excerpt}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/55">
              {post.authorName && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" aria-hidden />
                  {post.authorName}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                <time dateTime={post.date}>{dateLabel}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {post.readTime} {copy.read}
              </span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap justify-center gap-2">
                {post.tags.map((tag) => (
                  <li
                    key={tag}
                    className="border-b border-white/25 pb-0.5 text-xs tracking-wide text-white/65"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex justify-center">
              <BlogShareLinks
                url={shareUrl}
                title={post.title}
                locale={locale}
                className="justify-center [&_a]:border-white/25 [&_a]:text-white/70 [&_a:hover]:border-primary-light [&_a:hover]:text-primary-light [&_button]:border-white/25 [&_button]:text-white/70 [&_button:hover]:border-primary-light [&_button:hover]:text-primary-light [&_span]:text-white/50"
              />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent"
          aria-hidden
        />
      </header>

      <div className="relative bg-background">
        <AnimatedSection className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-8">
          <div
            className={cn(
              "mx-auto grid gap-10",
              hasToc
                ? "max-w-6xl lg:grid-cols-[220px_minmax(0,42rem)_56px] lg:justify-center xl:grid-cols-[240px_minmax(0,42rem)_56px]"
                : "max-w-3xl lg:grid-cols-[minmax(0,1fr)_56px]",
            )}
          >
            {hasToc && (
              <div className="min-w-0 lg:order-1">
                <BlogTableOfContents headings={headings} locale={locale} />
              </div>
            )}

            <div className={cn("min-w-0", hasToc ? "lg:order-2" : "lg:order-1")}>
              <BlogPostBody
                html={contentHtml || undefined}
                paragraphs={post.content}
              />

              <div className="mt-12 border-t border-gray/50 pt-8 lg:hidden">
                <BlogShareLinks url={shareUrl} title={post.title} locale={locale} />
              </div>
            </div>

            <div
              className={cn(
                "hidden lg:block",
                hasToc ? "lg:order-3" : "lg:order-2",
              )}
            >
              <div className="sticky top-28">
                <BlogShareLinks
                  url={shareUrl}
                  title={post.title}
                  locale={locale}
                  variant="rail"
                />
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="border-y border-primary/10 bg-dark">
          <div className="container mx-auto flex max-w-3xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6 md:py-16 lg:px-8">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-light">
                SD CREATIV
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                {copy.ctaTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
                {copy.ctaBody}
              </p>
            </div>
            <Button
              href={copy.ctaHref}
              size="lg"
              className="shrink-0"
              data-track-cta
            >
              {copy.ctaButton}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </AnimatedSection>

        {related.length > 0 && (
          <AnimatedSection className="bg-gray-light/60">
            <div className="container mx-auto px-4 py-14 md:px-6 md:py-16 lg:px-8">
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {copy.relatedTitle}
                </h2>
                <Link
                  href={copy.relatedAllHref}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark"
                >
                  {copy.relatedAll}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => {
                  const href = isEn
                    ? `/en/blog/${item.slug}`
                    : `/blog/${item.slug}`;
                  const thumb = item.coverImage
                    ? resolveImageDisplayUrl(item.coverImage)
                    : null;
                  return (
                    <li key={item.slug}>
                      <Link href={href} className="group block">
                        <div
                          className={cn(
                            "relative mb-4 aspect-16/10 overflow-hidden bg-gray",
                            !thumb && "bg-linear-to-br from-primary/20 to-gray",
                          )}
                        >
                          {thumb && (
                            <Image
                              src={thumb}
                              alt={item.title}
                              fill
                              unoptimized={
                                isProxiedMediaUrl(thumb) || thumb.startsWith("http")
                              }
                              sizes="(max-width: 640px) 100vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {item.category}
                        </p>
                        <h3 className="mt-1.5 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                          {item.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-text">
                          {item.excerpt}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </AnimatedSection>
        )}

        {showComments && (
          <div className="container mx-auto max-w-3xl px-4 pb-16 md:px-6 lg:px-8">
            <BlogComments slug={post.slug} locale={locale} />
          </div>
        )}
      </div>
    </article>
  );
}
