import type { DevopsGithubSnapshot } from "@/lib/devops-github";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchDevopsSnapshot(): Promise<DevopsGithubSnapshot> {
  const res = await fetch("/api/admin/devops", { credentials: "include" });
  const json = await parseJson<{ devops: DevopsGithubSnapshot }>(res);
  return json.devops;
}
