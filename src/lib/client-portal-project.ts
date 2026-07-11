import type { ProjectStep } from "@/content/client-portal-types";
import type { ProjectStatus } from "@/content/projects-labels";
import { formatProjectDate } from "@/content/projects-labels";
import type { ClientProfileData } from "@/lib/client-portal-config";

export type PortalProjectPayload = {
  linked: boolean;
  crmClientId: string | null;
  crmProjectId: string | null;
  project: {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    status: ProjectStatus;
    statusLabel: string;
    progress: number;
    startDate: string | null;
    dueDate: string | null;
    budget: number | null;
    description: string | null;
  } | null;
  milestones: ProjectStep[];
};

/** Fusionne les données projet API dans le profil affiché (dashboard). */
export function applyPortalProjectToProfile(
  profile: ClientProfileData,
  payload: PortalProjectPayload,
): ClientProfileData {
  const next: ClientProfileData = {
    ...profile,
    linkedToCrm: payload.linked || profile.linkedToCrm,
    crmClientId: payload.crmClientId ?? profile.crmClientId,
    crmProjectId: payload.crmProjectId ?? profile.crmProjectId,
  };

  if (!payload.project) return next;

  return {
    ...next,
    linkedToCrm: true,
    projectTitle: payload.project.name,
    projectType: payload.project.typeLabel,
    projectStatus: payload.project.statusLabel,
    progress: payload.project.progress,
    startDate: formatProjectDate(payload.project.startDate),
    endDate: formatProjectDate(payload.project.dueDate),
    totalAmount: payload.project.budget ?? profile.totalAmount,
  };
}
