import type { KodivaModuleClientResponse } from "@/lib/kodiva-module-types";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchKodivaModule(): Promise<KodivaModuleClientResponse> {
  const res = await fetch("/api/admin/kodiva/module", { credentials: "include" });
  return parseJson<KodivaModuleClientResponse>(res);
}
