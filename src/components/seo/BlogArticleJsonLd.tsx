import type { BlogPost } from "@/content/blog";
import { SITE } from "@/lib/constants";

type Props = { post: BlogPost; locale?: "fr" | "en" };

export function BlogArticleJsonLd({ post, locale = "fr" }: Props) {
  const url =
    locale === "en"
      ? `${SITE.url}/en/blog/${post.slug}`
      : `${SITE.url}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    articleSection: post.category,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
