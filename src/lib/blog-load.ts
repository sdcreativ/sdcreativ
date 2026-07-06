import { getBlogPost } from "@/lib/cms";
import { resolveBlogSlugRedirect } from "@/lib/blog-slug-redirects";
import { permanentRedirect } from "next/navigation";

type Options = {
  previewToken?: string;
};

export async function getBlogPostOrRedirect(slug: string, options?: Options) {
  const post = await getBlogPost(slug, { previewToken: options?.previewToken });
  if (post || options?.previewToken) return post;

  const redirectSlug = await resolveBlogSlugRedirect(slug);
  if (redirectSlug) {
    permanentRedirect(`/blog/${redirectSlug}`);
  }

  return undefined;
}
