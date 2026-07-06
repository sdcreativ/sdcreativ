import type { BlogCategoryRecord } from "@/lib/blog-categories";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchBlogCategoriesApi(): Promise<BlogCategoryRecord[]> {
  const res = await fetch("/api/admin/blog-categories", { credentials: "include" });
  const json = await parseFetchJson<{ categories: BlogCategoryRecord[] }>(res);
  return json.categories;
}

export async function createBlogCategoryApi(input: {
  name: string;
  sortOrder?: number;
}): Promise<BlogCategoryRecord> {
  const res = await fetch("/api/admin/blog-categories", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ category: BlogCategoryRecord }>(res);
  return json.category;
}

export async function updateBlogCategoryApi(
  id: string,
  input: { name?: string; sortOrder?: number },
): Promise<BlogCategoryRecord> {
  const res = await fetch(`/api/admin/blog-categories/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ category: BlogCategoryRecord }>(res);
  return json.category;
}

export async function deleteBlogCategoryApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/blog-categories/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}
