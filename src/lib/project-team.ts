import { withDb } from "@/lib/db";
import type { Project } from "@/lib/projects";

export type ProjectTeamMember = {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
};

/** Lecture table relationnelle (+ fallback metadata legacy). */
export async function listProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      user_id: string;
      name: string;
      email: string;
      role: string;
      joined_at: Date;
    }>(
      `SELECT ptm.user_id, u.name, u.email, ptm.role, ptm.joined_at
       FROM project_team_members ptm
       JOIN crm_users u ON u.id = ptm.user_id
       WHERE ptm.project_id = $1
       ORDER BY u.name ASC`,
      [projectId],
    );
    return rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role,
      joinedAt: r.joined_at.toISOString(),
    }));
  });
}

export async function setProjectTeamMembers(
  projectId: string,
  userIds: string[],
): Promise<ProjectTeamMember[]> {
  const unique = [...new Set(userIds.filter(Boolean))];
  return withDb(async (query) => {
    await query(`DELETE FROM project_team_members WHERE project_id = $1`, [projectId]);
    for (const userId of unique) {
      await query(
        `INSERT INTO project_team_members (project_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [projectId, userId],
      );
    }
    // Mirror names into metadata for consumers not yet migrated
    const members = await listProjectTeamMembers(projectId);
    const names = members.map((m) => m.name);
    await query(
      `UPDATE projects
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('teamMembers', $2::jsonb),
           updated_at = NOW()
       WHERE id = $1`,
      [projectId, JSON.stringify(names)],
    );
    return members;
  });
}

/** @deprecated Prefer listProjectTeamMembers — lecture locale depuis metadata. */
export function getProjectTeamMembers(project: Project): string[] {
  const raw = project.metadata?.teamMembers;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** @deprecated Prefer setProjectTeamMembers with user IDs. */
export function buildTeamMetadataUpdate(
  project: Project,
  teamMembers: string[],
): Record<string, unknown> {
  return {
    ...project.metadata,
    teamMembers: [...new Set(teamMembers.map((m) => m.trim()).filter(Boolean))],
  };
}
