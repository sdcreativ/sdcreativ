import { createClient, type SanityClient } from "@sanity/client";
import {
  isSanityConfigured,
  mapSanityBlog,
  mapSanityProject,
  type SanityBlogDoc,
  type SanityProjectDoc,
} from "@/lib/cms/types";

let client: SanityClient | null = null;

function getClient(): SanityClient {
  if (!client) {
    client = createClient({
      projectId: process.env.SANITY_PROJECT_ID!,
      dataset: process.env.SANITY_DATASET!,
      apiVersion: process.env.SANITY_API_VERSION ?? "2024-01-01",
      token: process.env.SANITY_API_TOKEN,
      useCdn: true,
    });
  }
  return client;
}

export async function fetchBlogPostsFromSanity() {
  const docs = await getClient().fetch<SanityBlogDoc[]>(
    `*[_type == "post" && defined(slug.current)] | order(date desc) {
      slug, title, excerpt, category, date, readTime, content
    }`,
  );
  return docs.map(mapSanityBlog);
}

export async function fetchBlogPostFromSanity(slug: string) {
  const doc = await getClient().fetch<SanityBlogDoc | null>(
    `*[_type == "post" && slug.current == $slug][0] {
      slug, title, excerpt, category, date, readTime, content
    }`,
    { slug },
  );
  return doc ? mapSanityBlog(doc) : null;
}

export async function fetchRealisationsFromSanity() {
  const docs = await getClient().fetch<SanityProjectDoc[]>(
    `*[_type == "project" && defined(id)] | order(year desc) {
      id, title, client, sector, location, year, duration, category,
      description, tags, stack, image, imageAlt, accent, metric, featured,
      caseStudy, testimonial, beforeAfter
    }`,
  );
  return docs.map(mapSanityProject);
}

export async function fetchRealisationFromSanity(id: string) {
  const doc = await getClient().fetch<SanityProjectDoc | null>(
    `*[_type == "project" && id == $id][0] {
      id, title, client, sector, location, year, duration, category,
      description, tags, stack, image, imageAlt, accent, metric, featured,
      caseStudy, testimonial, beforeAfter
    }`,
    { id },
  );
  return doc ? mapSanityProject(doc) : null;
}

export { isSanityConfigured };
