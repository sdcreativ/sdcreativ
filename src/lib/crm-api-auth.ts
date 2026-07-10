import { requireAdminAuth } from "@/lib/admin-auth";
import { CRM_SEARCH_READ_PERMISSIONS, CRM_SETTINGS_ACCESS_PERMISSIONS } from "@/lib/crm-access";
import type { CrmPermission } from "@/lib/crm-permissions";

function read(permission: CrmPermission) {
  return () => requireAdminAuth({ permission });
}

function write(permission: CrmPermission) {
  return () => requireAdminAuth({ permission });
}

export const crmApiAuth = {
  session: () => requireAdminAuth(),
  account: (allowPasswordChange = true) => requireAdminAuth({ allowPasswordChange }),
  search: () => requireAdminAuth({ anyPermission: CRM_SEARCH_READ_PERMISSIONS }),
  settingsAccess: () => requireAdminAuth({ anyPermission: CRM_SETTINGS_ACCESS_PERMISSIONS }),
  leads: { read: read("leads.read"), write: write("leads.write") },
  clients: { read: read("clients.read"), write: write("clients.write") },
  projects: { read: read("projects.read"), write: write("projects.write") },
  quotes: { read: read("quotes.read"), write: write("quotes.write") },
  invoices: { read: read("invoices.read"), write: write("invoices.write") },
  tasks: { read: read("tasks.read"), write: write("tasks.write") },
  tickets: { read: read("tickets.read"), write: write("tickets.write") },
  reports: { read: read("reports.view"), write: read("reports.view") },
  documents: { read: read("documents.read"), write: write("documents.write") },
  blog: { read: read("blog.read"), write: write("blog.write") },
  site: { read: read("site.read"), write: write("site.write") },
  audit: read("audit.view"),
  users: { read: read("users.manage"), write: write("users.manage") },
  settings: { read: read("settings.manage"), write: write("settings.manage") },
  infra: { read: read("infra.view") },
};
