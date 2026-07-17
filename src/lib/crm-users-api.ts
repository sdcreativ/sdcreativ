import type { CrmUser } from "@/lib/crm-users";
import type { CrmRole } from "@/content/crm-roles";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchCrmUsers(): Promise<CrmUser[]> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  const json = await parseJson<{ users: CrmUser[] }>(res);
  return json.users;
}

export async function fetchTeamMemberNames(): Promise<string[]> {
  const res = await fetch("/api/admin/users/team", { credentials: "include" });
  const json = await parseJson<{ names: string[] }>(res);
  return json.names;
}

export async function fetchTeamMembers(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch("/api/admin/users/team?withIds=1", { credentials: "include" });
  const json = await parseJson<{ members?: Array<{ id: string; name: string }>; names: string[] }>(
    res,
  );
  if (json.members?.length) return json.members;
  return json.names.map((name, i) => ({ id: `legacy-${i}`, name }));
}

export async function createCrmUserApi(input: Record<string, unknown>): Promise<{
  user: CrmUser;
  invitationSent: boolean;
}> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ user: CrmUser; invitationSent: boolean }>(res);
  return { user: json.user, invitationSent: json.invitationSent };
}

export async function resendUserInvitationApi(
  id: string,
): Promise<{ invitationSent: boolean }> {
  const res = await fetch(`/api/admin/users/${id}/resend-invitation`, {
    method: "POST",
    credentials: "include",
  });
  const json = await parseJson<{ invitationSent: boolean }>(res);
  return { invitationSent: json.invitationSent };
}

export async function updateCrmUserApi(
  id: string,
  input: Record<string, unknown>,
): Promise<CrmUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ user: CrmUser }>(res);
  return json.user;
}

export async function deleteCrmUserApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export type { CrmRole };
