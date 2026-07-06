import type { Project } from "@/lib/projects";

export function getProjectTeamMembers(project: Project): string[] {
  const raw = project.metadata?.teamMembers;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function buildTeamMetadataUpdate(
  project: Project,
  teamMembers: string[],
): Record<string, unknown> {
  return {
    ...project.metadata,
    teamMembers: [...new Set(teamMembers.map((m) => m.trim()).filter(Boolean))],
  };
}
