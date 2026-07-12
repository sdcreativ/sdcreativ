import type { QuoteTemplate } from "@/lib/quote-templates";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchQuoteTemplates(activeOnly = false): Promise<QuoteTemplate[]> {
  const params = activeOnly ? "?active=1" : "";
  const res = await fetch(`/api/admin/quote-templates${params}`, { credentials: "include" });
  const json = await parseFetchJson<{ templates: QuoteTemplate[] }>(res);
  return json.templates;
}

export async function fetchQuoteTemplate(id: string): Promise<QuoteTemplate> {
  const res = await fetch(`/api/admin/quote-templates/${id}`, { credentials: "include" });
  const json = await parseFetchJson<{ template: QuoteTemplate }>(res);
  return json.template;
}

export async function createQuoteTemplateApi(
  input: Record<string, unknown>,
): Promise<QuoteTemplate> {
  const res = await fetch("/api/admin/quote-templates", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ template: QuoteTemplate }>(res);
  return json.template;
}

export async function updateQuoteTemplateApi(
  id: string,
  input: Record<string, unknown>,
): Promise<QuoteTemplate> {
  const res = await fetch(`/api/admin/quote-templates/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ template: QuoteTemplate }>(res);
  return json.template;
}

export async function deleteQuoteTemplateApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/quote-templates/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}
