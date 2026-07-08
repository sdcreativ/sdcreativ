import type { PublicTeamMemberRecord } from "@/lib/public-team-members";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchTeamMembersAdmin(locale?: string): Promise<PublicTeamMemberRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/team-members${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ members: PublicTeamMemberRecord[] }>(res);
  return json.members;
}

export async function createTeamMemberApi(
  input: Record<string, unknown>,
): Promise<PublicTeamMemberRecord> {
  const res = await fetch("/api/admin/team-members", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ member: PublicTeamMemberRecord }>(res);
  return json.member;
}

export async function updateTeamMemberApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicTeamMemberRecord> {
  const res = await fetch(`/api/admin/team-members/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ member: PublicTeamMemberRecord }>(res);
  return json.member;
}

export async function deleteTeamMemberApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/team-members/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderTeamMemberApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicTeamMemberRecord> {
  const res = await fetch(`/api/admin/team-members/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ member: PublicTeamMemberRecord }>(res);
  return json.member;
}

export async function importStaticTeamMembersApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/team-members/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}

export async function uploadTeamMemberImageApi(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/team-members/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseFetchJson<{ url: string }>(res);
}
