import type { WorkloadSnapshot } from "@/lib/workload";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchCommercialWorkload(): Promise<WorkloadSnapshot> {
  const res = await fetch("/api/admin/workload", { credentials: "include" });
  return parseFetchJson<WorkloadSnapshot>(res);
}
