import type { EmployeeContract } from "@/lib/employee-contracts";
import type {
  EmployeeContractStatus,
  EmployeeContractType,
} from "@/content/employee-contracts-labels";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchEmployeeContracts(filters?: {
  userId?: string;
  status?: EmployeeContractStatus;
  contractType?: EmployeeContractType;
}): Promise<EmployeeContract[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.contractType) params.set("contractType", filters.contractType);
  const qs = params.toString();
  const res = await fetch(`/api/admin/employee-contracts${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseJson<{ contracts: EmployeeContract[] }>(res);
  return json.contracts;
}

export async function createEmployeeContractApi(
  input: Record<string, unknown>,
): Promise<EmployeeContract> {
  const res = await fetch("/api/admin/employee-contracts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ contract: EmployeeContract }>(res);
  return json.contract;
}

export async function updateEmployeeContractApi(
  id: string,
  input: Record<string, unknown>,
): Promise<EmployeeContract> {
  const res = await fetch(`/api/admin/employee-contracts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ contract: EmployeeContract }>(res);
  return json.contract;
}

export async function deleteEmployeeContractApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/employee-contracts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function sendEmployeeContractForNativeSignApi(
  contractId: string,
  input: { signerEmail?: string | null } = {},
): Promise<{ contract: EmployeeContract; signUrl: string }> {
  const res = await fetch(
    `/api/admin/employee-contracts/${encodeURIComponent(contractId)}/native-sign`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJson<{ contract: EmployeeContract; signUrl: string }>(res);
}

export async function sendEmployeeContractForEsignApi(
  contractId: string,
  input: { signerEmail: string; signerName?: string | null },
): Promise<EmployeeContract> {
  const res = await fetch(
    `/api/admin/employee-contracts/${encodeURIComponent(contractId)}/esign`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = await parseJson<{ contract: EmployeeContract }>(res);
  return json.contract;
}
