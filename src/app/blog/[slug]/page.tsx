import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BlogComments } from "@/components/blog/BlogComments";
import { BlogPostBody } from "@/components/blog/BlogPostBody";
import { BlogPostTracker } from "@/components/blog/BlogPostTracker";
import { BlogPreviewBanner } from "@/components/blog/BlogPreviewBanner";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { BlogArticleJsonLd } from "@/components/seo/BlogArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getBlogPosts } from "@/lib/cms";
import { getBlogPostOrRedirect } from "@/lib/blog-load";
import { createMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

/** Contenu CMS / preview dynamique → éviter DYNAMIC_SERVER_USAGE en prod. */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await getBlogPostOrRedirect(slug, { previewToken: preview });
  if (!post) return {};

  return createMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    path: `/blog/${slug}`,
    noIndex: Boolean(preview),
    image: post.ogImage ?? post.coverImage,
  });
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await getBlogPostOrRedirect(slug, { previewToken: preview });

  if (!post) notFound();

  const isPreview = Boolean(preview);

  const breadcrumb = [
    { label: "Accueil", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];

  return (
    <article>
      {!isPreview && <BlogPostTracker slug={post.slug} />}
      {isPreview && <BlogPreviewBanner />}
      <BlogArticleJsonLd post={post} />
      <BreadcrumbJsonLd items={breadcrumb} />
      <header className="bg-dark pt-28 pb-12 md:pt-32">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <Breadcrumb items={breadcrumb} className="mb-6" />
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-light">
            {post.category}
          </span>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" aria-hidden />
              {new Date(post.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden />
              {post.readTime} de lecture
            </span>
          </div>
          {post.tags && post.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/80"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {post.coverImage && (
        <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
          <div className="relative -mt-8 aspect-[2/1] overflow-hidden rounded-2xl border border-gray/60 shadow-lg md:-mt-12">
            <Image
              src={post.coverImage}
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-3xl px-4 py-12 md:px-6 lg:px-8">
        <BlogPostBody html={post.contentHtml} paragraphs={post.content} />

        <div className="mt-12 rounded-2xl bg-primary-light p-8 text-center">
          <h2 className="text-xl font-bold text-foreground">
            Un projet web en tête ?
          </h2>
          <p className="mt-2 text-gray-text">
            Contactez SD CREATIV pour un devis gratuit et personnalisé.
          </p>
          <Button href="/contact" className="mt-4" data-track-cta>
            Demander un devis
          </Button>
        </div>

        {!isPreview && <BlogComments slug={post.slug} />}
      </div>
    </article>
  );
}
