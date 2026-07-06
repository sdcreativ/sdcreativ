import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Star } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedCard } from "@/components/ui/AnimatedSection";
import { getBlogPosts } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Blog & Conseils",
  description:
    "Conseils, guides et actualités sur le web, le SEO, le e-commerce et la transformation digitale pour PME.",
  path: "/blog",
});

export default async function BlogPage() {
  const allPosts = await getBlogPosts();
  const featured = allPosts
    .filter((post) => post.featuredOrder != null && post.featuredOrder >= 1 && post.featuredOrder <= 3)
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
    .slice(0, 3);
  const featuredSlugs = new Set(featured.map((post) => post.slug));
  const blogPosts = allPosts.filter((post) => !featuredSlugs.has(post.slug));

  function PostCard({
    post,
    i,
    large = false,
  }: {
    post: (typeof allPosts)[number];
    i: number;
    large?: boolean;
  }) {
    return (
      <AnimatedCard
        delay={i * 0.06}
        className={cn(
          "group flex flex-col overflow-hidden rounded-2xl border border-gray bg-white shadow-sm transition-shadow hover:shadow-lg",
          large && "md:flex-row md:items-stretch",
        )}
      >
        {post.coverImage ? (
          <div
            className={cn(
              "relative overflow-hidden bg-gray-light",
              large ? "aspect-video md:aspect-auto md:w-1/2 md:min-h-[280px]" : "aspect-video",
            )}
          >
            <Image
              src={post.coverImage}
              alt=""
              fill
              unoptimized
              sizes={large ? "(max-width: 768px) 100vw, 600px" : "(max-width: 768px) 100vw, 400px"}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : (
          <div
            className={cn(
              "bg-gradient-to-br from-primary/15 to-gray-light",
              large ? "aspect-video md:aspect-auto md:w-1/2 md:min-h-[280px]" : "aspect-video",
            )}
          />
        )}
        <div className={cn("flex flex-1 flex-col p-6", large && "md:justify-center")}>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {post.category}
          </span>
          <h2
            className={cn(
              "mt-2 font-bold text-foreground group-hover:text-primary",
              large ? "text-2xl md:text-3xl" : "text-xl",
            )}
          >
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-text">{post.excerpt}</p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-text">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {new Date(post.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {post.readTime}
            </span>
          </div>
          <Link
            href={`/blog/${post.slug}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            Lire l&apos;article
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </AnimatedCard>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Blog & Conseils"
        title="Actualités &"
        highlight="expertise digitale"
        description="Des articles pratiques pour vous aider à développer votre présence en ligne et atteindre vos objectifs business."
        breadcrumb={[
          { label: "Accueil", href: "/" },
          { label: "Blog" },
        ]}
      />

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <p className="mb-10 text-right">
            <Link
              href="/blog/feed.xml"
              className="text-sm font-medium text-primary hover:underline"
            >
              Flux RSS
            </Link>
          </p>
          {featured.length > 0 && (
            <div className="mb-16">
              <div className="mb-8 flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" aria-hidden />
                <h2 className="text-2xl font-bold text-foreground">À la une</h2>
              </div>
              <div className="space-y-8">
                {featured[0] && (
                  <PostCard key={featured[0].slug} post={featured[0]} i={0} large />
                )}
                {featured.length > 1 && (
                  <div className="grid gap-8 md:grid-cols-2">
                    {featured.slice(1).map((post, i) => (
                      <PostCard key={post.slug} post={post} i={i + 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {blogPosts.length > 0 && (
            <>
              {featured.length > 0 && (
                <h2 className="mb-8 text-xl font-bold text-foreground">Tous les articles</h2>
              )}
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {blogPosts.map((post, i) => (
                  <PostCard key={post.slug} post={post} i={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
