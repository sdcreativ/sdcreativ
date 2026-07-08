import { teamMembers as staticTeamMembers } from "@/content/team";
import type { TeamMember } from "@/content/team";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicTeamMembers, toTeamMember } from "@/lib/public-team-members";

/** Membres visibles sur le site public (DB → fallback statique). */
export async function getTeamMembers(locale = "fr"): Promise<TeamMember[]> {
  if (!isDatabaseConfigured()) {
    return staticTeamMembers;
  }

  try {
    const records = await listPublicTeamMembers({ locale, visibleOnly: true });
    if (records.length > 0) {
      return records.map(toTeamMember);
    }
  } catch (error) {
    console.error("[public-team] getTeamMembers fallback:", error);
  }

  return staticTeamMembers;
}
