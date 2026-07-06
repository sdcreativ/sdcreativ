/** Valeur par défaut si la base CRM n'est pas disponible. */
export const CRM_TEAM_MEMBERS = ["Non assigné"] as const;

export type CrmTeamMember = (typeof CRM_TEAM_MEMBERS)[number];

export function isCrmTeamMember(value: string): value is CrmTeamMember {
  return (CRM_TEAM_MEMBERS as readonly string[]).includes(value);
}
