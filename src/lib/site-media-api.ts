import { parseFetchJson } from "@/lib/fetch-json";

export async function uploadSiteMediaApi(file: File): Promise<{ url: string; storage: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/site-media/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseFetchJson<{ url: string; storage: string }>(res);
}
