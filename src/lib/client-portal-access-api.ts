import type { PortalAccessStatus } from "@/lib/client-portal-access";
import type { Client } from "@/lib/clients";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Erreur serveur.");
  return json;
}

export async function fetchClientPortalAccessStatus(clientId: string): Promise<PortalAccessStatus> {
  const res = await fetch(`/api/admin/clients/${clientId}/portal-access`, {
    credentials: "include",
  });
  const json = await parseJson<{ status: PortalAccessStatus }>(res);
  return json.status;
}

export async function generateClientPortalAccessApi(
  clientId: string,
  input: { sendEmail?: boolean } = {},
): Promise<{
  status: PortalAccessStatus;
  client: Client;
  portalClientId: string;
  plainToken: string;
  emailSent: boolean;
}> {
  const res = await fetch(`/api/admin/clients/${clientId}/portal-access`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate", sendEmail: input.sendEmail }),
  });
  return parseJson(res);
}

export async function resendClientPortalAccessApi(clientId: string): Promise<{
  status: PortalAccessStatus;
  client: Client;
  portalClientId: string;
  plainToken: string;
  emailSent: boolean;
}> {
  const res = await fetch(`/api/admin/clients/${clientId}/portal-access`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "resend" }),
  });
  return parseJson(res);
}

export async function revokeClientPortalAccessApi(clientId: string): Promise<{
  status: PortalAccessStatus;
  client: Client;
}> {
  const res = await fetch(`/api/admin/clients/${clientId}/portal-access`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "revoke" }),
  });
  return parseJson(res);
}

export type { PortalAccessStatus };
