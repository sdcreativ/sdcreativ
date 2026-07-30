import { notFound } from "next/navigation";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { BlogArticleJsonLd } from "@/components/seo/BlogArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { blogPostsEn, getBlogPostEn } from "@/content/blog-en";
import { createMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  return blogPostsEn.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostEn(slug);
  if (!post) return {};

  return createMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    path: `/en/blog/${slug}`,
    locale: "en",
    image: post.ogImage ?? post.coverImage,
  });
}

export default async function EnBlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostEn(slug);
  if (!post) notFound();

  const related = blogPostsEn
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const sameCat = Number(b.category === post.category) - Number(a.category === post.category);
      if (sameCat !== 0) return sameCat;
      return b.date.localeCompare(a.date);
    })
    .slice(0, 3);

  const breadcrumb = [
    { label: "Home", href: "/en" },
    { label: "Blog", href: "/en/blog" },
    { label: post.title },
  ];

  return (
    <>
      <BlogArticleJsonLd post={post} locale="en" />
      <BreadcrumbJsonLd items={breadcrumb} />
      <BlogArticleView post={post} related={related} locale="en" showComments={false} />
    </>
  );
}
