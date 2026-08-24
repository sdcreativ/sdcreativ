import type { BlogPost } from "@/content/blog";
import { SITE, LOGO } from "@/lib/constants";

type Props = { post: BlogPost; locale?: "fr" | "en" };

function toAbsoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE.url}${path}`;
}

export function BlogArticleJsonLd({ post, locale = "fr" }: Props) {
  const url =
    locale === "en"
      ? `${SITE.url}/en/blog/${post.slug}`
      : `${SITE.url}/blog/${post.slug}`;

  const imagePath = post.ogImage ?? post.coverImage;
  const image = imagePath ? toAbsoluteUrl(imagePath) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.updatedAt ?? post.date,
    ...(image ? { image: [image] } : {}),
    author: {
      "@type": "Organization",
      name: post.authorName ?? SITE.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: toAbsoluteUrl(LOGO.src),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    articleSection: post.category,
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
