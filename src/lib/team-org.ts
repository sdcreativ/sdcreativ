import type { TeamMember } from "@/content/team";

export type TeamOrgTier = "leadership" | "operations";

/** Cofondateurs / direction en haut ; autres rôles (ex. responsable commerciale) en dessous. */
export function getTeamOrgTier(member: TeamMember): TeamOrgTier {
  const role = member.role.toLowerCase();
  if (
    role.includes("cofondateur") ||
    role.includes("cofondatrice") ||
    role.includes("directeur") ||
    role.includes("directrice") ||
    role.includes("direction")
  ) {
    return "leadership";
  }
  return "operations";
}

export function splitTeamByOrgTier(members: TeamMember[]): {
  leadership: TeamMember[];
  operations: TeamMember[];
} {
  const leadership: TeamMember[] = [];
  const operations: TeamMember[] = [];

  for (const member of members) {
    if (getTeamOrgTier(member) === "leadership") {
      leadership.push(member);
    } else {
      operations.push(member);
    }
  }

  // Si aucun cofondateur détecté, tout le monde reste sur une seule ligne.
  if (leadership.length === 0) {
    return { leadership: members, operations: [] };
  }

  return { leadership, operations };
}
