import type { CareerApplication } from "@/lib/career-applications";
import type { CareerApplicationStatus } from "@/content/priority3-labels";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchCareerApplications(): Promise<CareerApplication[]> {
  const res = await fetch("/api/admin/career-applications", { credentials: "include" });
  const json = await parseFetchJson<{ applications: CareerApplication[] }>(res);
  return json.applications ?? [];
}

export async function patchCareerApplicationApi(
  id: string,
  status: CareerApplicationStatus,
): Promise<void> {
  const res = await fetch("/api/admin/career-applications", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  await parseFetchJson(res);
}
