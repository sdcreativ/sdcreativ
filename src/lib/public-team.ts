import { teamMembers as staticTeamMembers } from "@/content/team";
import type { TeamMember } from "@/content/team";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicTeamMembers, toTeamMember } from "@/lib/public-team-members";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

/** Membres visibles sur le site public (DB → fallback seed hors prod). */
export async function getTeamMembers(locale = "fr"): Promise<TeamMember[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticTeamMembers : [];
  }

  try {
    const records = await listPublicTeamMembers({ locale, visibleOnly: true });
    if (records.length > 0) {
      return records.map(toTeamMember);
    }
  } catch (error) {
    console.error("[public-team] getTeamMembers fallback:", error);
  }

  return allowStaticContentFallback() ? staticTeamMembers : [];
}
