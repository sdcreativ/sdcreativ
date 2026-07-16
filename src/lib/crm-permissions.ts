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
  "infra.view",
  "documents.read",
  "documents.write",
  "blog.read",
  "blog.write",
  "site.read",
  "site.write",
  "mail.read",
  "mail.write",
  "mail.manage",
] as const;

export type CrmPermission = (typeof CRM_PERMISSIONS)[number];

export const CRM_PERMISSION_GROUPS: Array<{
  id: string;
  label: string;
  permissions: CrmPermission[];
}> = [
  {
    id: "admin",
    label: "Administration",
    permissions: ["users.manage", "settings.manage", "audit.view"],
  },
  {
    id: "commercial",
    label: "Commercial",
    permissions: ["leads.read", "leads.write", "clients.read", "clients.write", "quotes.read", "quotes.write"],
  },
  {
    id: "operations",
    label: "Opérations",
    permissions: ["projects.read", "projects.write", "tasks.read", "tasks.write", "tickets.read", "tickets.write"],
  },
  {
    id: "billing",
    label: "Facturation & documents",
    permissions: ["invoices.read", "invoices.write", "documents.read", "documents.write"],
  },
  {
    id: "content",
    label: "Contenu & site",
    permissions: ["blog.read", "blog.write", "site.read", "site.write"],
  },
  {
    id: "insights",
    label: "Reporting & infra",
    permissions: ["reports.view", "infra.view"],
  },
  {
    id: "mail",
    label: "Messagerie",
    permissions: ["mail.read", "mail.write", "mail.manage"],
  },
];

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
  "infra.view": "Voir la santé infra VPS",
  "documents.read": "Voir les documents",
  "documents.write": "Gérer les documents",
  "blog.read": "Voir le blog",
  "blog.write": "Gérer le blog",
  "site.read": "Voir le contenu du site vitrine",
  "site.write": "Gérer le contenu du site vitrine",
  "mail.read": "Voir la messagerie (emails Hostinger)",
  "mail.write": "Répondre depuis la messagerie",
  "mail.manage": "Configurer les boîtes mail synchronisées",
};

const ALL: CrmPermission[] = [...CRM_PERMISSIONS];

export const ROLE_PERMISSIONS: Record<CrmRole, CrmPermission[]> = {
  admin: ALL,
  sales_director: [
    // Commercial
    "leads.read",
    "leads.write",
    "clients.read",
    "clients.write",
    "quotes.read",
    "quotes.write",

    // Pilotage
    "reports.view",

    // Opérations (lecture / suivi)
    "projects.read",
    "tasks.read",
    "tasks.write",
    "tickets.read",

    // Facturation & documents (lecture)
    "invoices.read",
    "documents.read",

    // Messagerie partagée
    "mail.read",
    "mail.write",
  ],
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
    "mail.read",
    "mail.write",
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
    "mail.read",
    "mail.write",
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
    "mail.read",
    "mail.write",
  ],
};

/** Accès messagerie pour toute l’équipe (hors mail.manage, réservé admin). */
export const TEAM_MAIL_PERMISSIONS: CrmPermission[] = ["mail.read", "mail.write"];

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
