import type { CrmSettingsPayload, CrmBranding, CrmEmailTemplate } from "@/lib/crm-settings-types";
import type { SitePublicSettings } from "@/lib/site-public-types";
import type { CrmAuditLog } from "@/lib/crm-audit";
import type { CrmRole } from "@/content/crm-roles";
import type { CrmPermission } from "@/lib/crm-permissions";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export type CrmSessionInfo = {
  userId: string;
  email: string;
  name: string;
  role: CrmRole;
  roleLabel?: string;
  permissions: CrmPermission[];
};

export async function fetchCrmSession(): Promise<CrmSessionInfo> {
  const res = await fetch("/api/admin/settings/session", { credentials: "include" });
  const json = await parseJson<{ session: CrmSessionInfo }>(res);
  return json.session;
}

export async function fetchCrmSettings(): Promise<CrmSettingsPayload> {
  const res = await fetch("/api/admin/settings", { credentials: "include" });
  const json = await parseJson<{ settings: CrmSettingsPayload }>(res);
  return json.settings;
}

export async function updateCrmBrandingApi(branding: CrmBranding): Promise<CrmBranding> {
  const res = await fetch("/api/admin/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branding }),
  });
  const json = await parseJson<{ branding: CrmBranding }>(res);
  return json.branding;
}

export async function updateCrmEmailTemplateApi(input: {
  id: string;
  subject: string;
  htmlBody: string;
}): Promise<CrmEmailTemplate> {
  const res = await fetch("/api/admin/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailTemplate: input }),
  });
  const json = await parseJson<{ template: CrmEmailTemplate }>(res);
  return json.template;
}

export async function updateSitePublicSettingsApi(
  sitePublic: SitePublicSettings,
): Promise<SitePublicSettings> {
  const res = await fetch("/api/admin/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sitePublic }),
  });
  const json = await parseJson<{ sitePublic: SitePublicSettings }>(res);
  return json.sitePublic;
}

export async function sendTestEmailTemplateApi(templateId: string, to: string): Promise<void> {
  const res = await fetch("/api/admin/settings/email-templates/test", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, to }),
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchCrmAuditLogs(limit = 50): Promise<CrmAuditLog[]> {
  const res = await fetch(`/api/admin/audit-logs?limit=${limit}`, { credentials: "include" });
  const json = await parseJson<{ logs: CrmAuditLog[] }>(res);
  return json.logs;
}
