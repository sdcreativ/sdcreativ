/** Rôles système livrés par défaut (non supprimables). */
export const SYSTEM_CRM_ROLES = ["admin", "sales_director", "commercial", "project_manager", "readonly"] as const;

export type SystemCrmRole = (typeof SYSTEM_CRM_ROLES)[number];

/** Slug de rôle CRM (système ou personnalisé). */
export type CrmRole = string;

/** @deprecated Utiliser listCrmRoles() — conservé pour compatibilité. */
export const CRM_ROLES = SYSTEM_CRM_ROLES;

export const CRM_ROLE_LABELS: Record<SystemCrmRole, string> = {
  admin: "Administrateur",
  sales_director: "Directeur commercial",
  commercial: "Commercial",
  project_manager: "Chef de projet",
  readonly: "Lecture seule",
};

export function isSystemCrmRole(value: string): value is SystemCrmRole {
  return (SYSTEM_CRM_ROLES as readonly string[]).includes(value);
}

/** @deprecated Préférer getCachedRoleLabel() côté serveur ou les rôles API côté client. */
export function isCrmRole(value: string): boolean {
  return value.length >= 2;
}
