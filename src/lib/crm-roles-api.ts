import type { CrmPermission } from "@/lib/crm-permissions";
import type { CrmRoleRecord } from "@/lib/crm-roles-db";
import { parseFetchJson } from "@/lib/fetch-json";

async function parseJson<T>(res: Response): Promise<T> {
  return parseFetchJson<T>(res);
}

export async function fetchCrmRoles(): Promise<CrmRoleRecord[]> {
  const res = await fetch("/api/admin/roles", { credentials: "include" });
  const json = await parseJson<{ roles: CrmRoleRecord[] }>(res);
  return json.roles;
}

export async function createCrmRoleApi(input: {
  slug: string;
  label: string;
  permissions: CrmPermission[];
}): Promise<CrmRoleRecord> {
  const res = await fetch("/api/admin/roles", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ role: CrmRoleRecord }>(res);
  return json.role;
}

export async function updateCrmRoleApi(
  id: string,
  input: { label?: string; permissions?: CrmPermission[] },
): Promise<CrmRoleRecord> {
  const res = await fetch(`/api/admin/roles/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ role: CrmRoleRecord }>(res);
  return json.role;
}

export async function deleteCrmRoleApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/roles/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export type { CrmRoleRecord };
