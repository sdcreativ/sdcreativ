import type { BlogPost } from "@/content/blog";
import type { Realisation } from "@/content/realisations";

export function isSanityConfigured(): boolean {
  return Boolean(
    process.env.SANITY_PROJECT_ID &&
      process.env.SANITY_DATASET &&
      process.env.SANITY_API_TOKEN,
  );
}

export type SanityBlogDoc = {
  slug: { current: string };
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  content: string[];
};

export type SanityProjectDoc = {
  id: string;
  title: string;
  client: string;
  sector: string;
  location: string;
  year: string;
  duration: string;
  category: string;
  description: string;
  tags: string[];
  stack: string[];
  image: string;
  imageAlt: string;
  accent: string;
  metric?: { value: string; label: string };
  featured?: boolean;
  caseStudy: Realisation["caseStudy"];
  testimonial?: Realisation["testimonial"];
  beforeAfter?: Realisation["beforeAfter"];
};

export function mapSanityBlog(doc: SanityBlogDoc): BlogPost {
  return {
    slug: doc.slug.current,
    title: doc.title,
    excerpt: doc.excerpt,
    category: doc.category,
    date: doc.date,
    readTime: doc.readTime,
    content: doc.content,
  };
}

export function mapSanityProject(doc: SanityProjectDoc): Realisation {
  return {
    id: doc.id,
    title: doc.title,
    client: doc.client,
    sector: doc.sector,
    location: doc.location,
    year: doc.year,
    duration: doc.duration,
    category: doc.category,
    description: doc.description,
    tags: doc.tags,
    stack: doc.stack,
    image: doc.image,
    imageAlt: doc.imageAlt,
    accent: doc.accent,
    metric: doc.metric,
    featured: doc.featured,
    caseStudy: doc.caseStudy,
    testimonial: doc.testimonial,
    beforeAfter: doc.beforeAfter,
  };
}
