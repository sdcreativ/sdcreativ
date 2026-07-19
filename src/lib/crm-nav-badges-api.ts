import { parseFetchJson } from "@/lib/fetch-json";
import type { CrmNavBadges } from "@/lib/crm-nav-badges";

export async function fetchCrmNavBadges(): Promise<CrmNavBadges> {
  const res = await fetch("/api/admin/nav-badges", { credentials: "include" });
  const json = await parseFetchJson<{ badges: CrmNavBadges }>(res);
  return json.badges;
}
