import type { CrmRole, SystemCrmRole } from "@/content/crm-roles";
import { SYSTEM_CRM_ROLES } from "@/content/crm-roles";

export const CRM_PERMISSIONS = [
  "users.manage",
  "settings.manage",
  "audit.view",
  "leads.read",
  "leads.write",
  "clients.read",
  "clients.write",
  "projects.read",
  "projects.write",
  "quotes.read",
  "quotes.write",
  "invoices.read",
  "invoices.write",
  "tasks.read",
  "tasks.write",
  "tickets.read",
  "tickets.write",
  "reports.view",
  "documents.read",
  "documents.write",
  "blog.read",
  "blog.write",
  "site.read",
  "site.write",
] as const;

export type CrmPermission = (typeof CRM_PERMISSIONS)[number];

export const CRM_PERMISSION_LABELS: Record<CrmPermission, string> = {
  "users.manage": "Gérer les utilisateurs",
  "settings.manage": "Modifier paramètres & branding",
  "audit.view": "Consulter le journal d'audit",
  "leads.read": "Voir les leads",
  "leads.write": "Modifier les leads",
  "clients.read": "Voir les clients",
  "clients.write": "Modifier les clients",
  "projects.read": "Voir les projets",
  "projects.write": "Modifier les projets",
  "quotes.read": "Voir les devis",
  "quotes.write": "Modifier les devis",
  "invoices.read": "Voir les factures",
  "invoices.write": "Modifier les factures",
  "tasks.read": "Voir les tâches",
  "tasks.write": "Modifier les tâches",
  "tickets.read": "Voir les tickets",
  "tickets.write": "Modifier les tickets",
  "reports.view": "Voir les rapports",
  "documents.read": "Voir les documents",
  "documents.write": "Gérer les documents",
  "blog.read": "Voir le blog",
  "blog.write": "Gérer le blog",
  "site.read": "Voir le contenu du site vitrine",
  "site.write": "Gérer le contenu du site vitrine",
};

const ALL: CrmPermission[] = [...CRM_PERMISSIONS];

export const ROLE_PERMISSIONS: Record<CrmRole, CrmPermission[]> = {
  admin: ALL,
  commercial: [
    "leads.read",
    "leads.write",
    "clients.read",
    "clients.write",
    "quotes.read",
    "quotes.write",
    "tasks.read",
    "tasks.write",
    "reports.view",
    "documents.read",
  ],
  project_manager: [
    "clients.read",
    "projects.read",
    "projects.write",
    "tasks.read",
    "tasks.write",
    "tickets.read",
    "tickets.write",
    "reports.view",
    "documents.read",
    "documents.write",
  ],
  readonly: [
    "leads.read",
    "clients.read",
    "projects.read",
    "quotes.read",
    "invoices.read",
    "tasks.read",
    "tickets.read",
    "reports.view",
    "documents.read",
  ],
};

let dynamicRolePermissions: Map<string, CrmPermission[]> | null = null;

/** Alimenté par crm-roles-db côté serveur — sans importer pg dans le client. */
export function setRolePermissionsCache(map: Map<string, CrmPermission[]>): void {
  dynamicRolePermissions = map;
}

export function getRolePermissions(role: CrmRole): CrmPermission[] {
  if (dynamicRolePermissions?.has(role)) {
    return dynamicRolePermissions.get(role)!;
  }
  if ((SYSTEM_CRM_ROLES as readonly string[]).includes(role)) {
    return ROLE_PERMISSIONS[role as SystemCrmRole];
  }
  return [];
}

export function roleHasPermission(role: CrmRole, permission: CrmPermission): boolean {
  return getRolePermissions(role).includes(permission);
}

export function roleCanWriteEntity(role: CrmRole, entity: string): boolean {
  return roleHasPermission(role, `${entity}.write` as CrmPermission);
}
