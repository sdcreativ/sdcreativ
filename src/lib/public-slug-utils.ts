import { slugifyBlogTitle } from "@/lib/blog-posts-types";

export function slugifyServiceTitle(title: string): string {
  return slugifyBlogTitle(title).slice(0, 80) || "service";
}

export function slugifyJobTitle(title: string): string {
  return slugifyBlogTitle(title).slice(0, 80) || "offre";
}
