import type { InfraHealth } from "@/lib/infra-health-types";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchInfraHealth(): Promise<InfraHealth> {
  const res = await fetch("/api/admin/infra/health", { credentials: "include" });
  const json = await parseJson<{ health: InfraHealth }>(res);
  return json.health;
}
