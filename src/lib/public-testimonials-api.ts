import type { PublicTestimonialRecord } from "@/lib/public-testimonials";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchTestimonialsAdmin(locale?: string): Promise<PublicTestimonialRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/testimonials${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ testimonials: PublicTestimonialRecord[] }>(res);
  return json.testimonials;
}

export async function createTestimonialApi(
  input: Record<string, unknown>,
): Promise<PublicTestimonialRecord> {
  const res = await fetch("/api/admin/testimonials", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ testimonial: PublicTestimonialRecord }>(res);
  return json.testimonial;
}

export async function updateTestimonialApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicTestimonialRecord> {
  const res = await fetch(`/api/admin/testimonials/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ testimonial: PublicTestimonialRecord }>(res);
  return json.testimonial;
}

export async function deleteTestimonialApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/testimonials/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderTestimonialApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicTestimonialRecord> {
  const res = await fetch(`/api/admin/testimonials/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ testimonial: PublicTestimonialRecord }>(res);
  return json.testimonial;
}

export async function importStaticTestimonialsApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/testimonials/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}
