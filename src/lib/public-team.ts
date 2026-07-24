import { teamMembers as staticTeamMembers } from "@/content/team";
import type { TeamMember } from "@/content/team";
import { allowLocaleStaticSeed } from "@/lib/cms-locale";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicTeamMembers, toTeamMember } from "@/lib/public-team-members";

/** Membres visibles sur le site public (DB → seed FR hors prod uniquement). */
export async function getTeamMembers(locale = "fr"): Promise<TeamMember[]> {
  if (!isDatabaseConfigured()) {
    return allowLocaleStaticSeed(locale) ? staticTeamMembers : [];
  }

  try {
    const records = await listPublicTeamMembers({ locale, visibleOnly: true });
    if (records.length > 0) {
      return records.map(toTeamMember);
    }
  } catch (error) {
    console.error("[public-team] getTeamMembers fallback:", error);
  }

  return allowLocaleStaticSeed(locale) ? staticTeamMembers : [];
}
