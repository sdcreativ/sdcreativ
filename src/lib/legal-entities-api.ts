import type { LegalEntity } from "@/lib/legal-entities";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchLegalEntities(): Promise<LegalEntity[]> {
  const res = await fetch("/api/admin/legal-entities", { credentials: "include" });
  const json = await parseFetchJson<{ entities: LegalEntity[] }>(res);
  return json.entities ?? [];
}

export async function createLegalEntityApi(input: {
  name: string;
  slug: string;
  currency: string;
}): Promise<LegalEntity> {
  const res = await fetch("/api/admin/legal-entities", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ entity: LegalEntity }>(res);
  return json.entity;
}
