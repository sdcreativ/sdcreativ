import type { Contract, ContractAmendment } from "@/lib/contracts";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchContracts(clientId?: string): Promise<Contract[]> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  const res = await fetch(`/api/admin/contracts${qs}`, { credentials: "include" });
  const json = await parseJson<{ contracts: Contract[] }>(res);
  return json.contracts;
}

export async function createContractApi(input: Record<string, unknown>): Promise<Contract> {
  const res = await fetch("/api/admin/contracts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ contract: Contract }>(res);
  return json.contract;
}

export async function updateContractApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Contract> {
  const res = await fetch(`/api/admin/contracts/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ contract: Contract }>(res);
  return json.contract;
}

export async function fetchContractDetail(id: string): Promise<{
  contract: Contract;
  amendments: ContractAmendment[];
}> {
  const res = await fetch(`/api/admin/contracts/${id}`, { credentials: "include" });
  return parseJson(res);
}

export async function createAmendmentApi(
  contractId: string,
  input: Record<string, unknown>,
): Promise<ContractAmendment> {
  const res = await fetch(`/api/admin/contracts/${contractId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "amendment", ...input }),
  });
  const json = await parseJson<{ amendment: ContractAmendment }>(res);
  return json.amendment;
}

export async function sendContractForEsignApi(
  contractId: string,
  input: { signerEmail: string; signerName?: string | null },
): Promise<Contract> {
  const res = await fetch(`/api/admin/contracts/${contractId}/esign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ contract: Contract }>(res);
  return json.contract;
}

export async function sendContractForNativeSignApi(
  contractId: string,
  input: { signerEmail?: string | null } = {},
): Promise<{ contract: Contract; signUrl: string }> {
  const res = await fetch(`/api/admin/contracts/${contractId}/native-sign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<{ contract: Contract; signUrl: string }>(res);
}
