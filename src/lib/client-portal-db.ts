import type { ProjectStatus } from "@/content/projects-labels";
import {
  PROJECT_TYPE_LABELS,
  formatProjectDate,
} from "@/content/projects-labels";
import type { ClientProfileData } from "@/lib/client-portal-config";
import { buildClientProfile, parseClientPortalConfig } from "@/lib/client-portal-config";
import { getClientByPortalId, type Client } from "@/lib/clients";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getPrimaryProjectByPortalClientId,
  listProjectMilestones,
  syncProjectMilestonesToProgress,
  type Project,
  type ProjectMilestone,
} from "@/lib/projects";
import type { ProjectStep } from "@/content/client-portal-types";
import {
  buildPortalPaymentsPayload,
  type PortalPaymentsPayload,
} from "@/lib/client-portal-payments";
import {
  alignProjectDisplay,
  computeProgressFromMilestones,
  MILESTONE_PROGRESS_DRIFT_THRESHOLD,
  resolvePortalProjectSteps,
} from "@/lib/client-portal-utils";

export type PortalCrmContext = {
  client: Client;
  project: Project | null;
  milestones: ProjectMilestone[];
};

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

const PORTAL_STATUS_LABELS: Record<ProjectStatus, string> = {
  discovery: "EN DÉCOUVERTE",
  design: "EN DESIGN",
  development: "EN DÉVELOPPEMENT",
  testing: "EN TEST",
  delivered: "LIVRÉ",
  on_hold: "EN PAUSE",
  cancelled: "ANNULÉ",
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return undefined;
}

export function milestonesToProjectSteps(milestones: ProjectMilestone[]): ProjectStep[] {
  return milestones.map((m, index) => ({
    id: index + 1,
    label: m.label,
    status: m.status,
  }));
}

export async function loadPortalCrmContext(portalClientId: string): Promise<PortalCrmContext | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const client = await getClientByPortalId(portalClientId);
    if (!client) return null;

    const project = await getPrimaryProjectByPortalClientId(portalClientId);
    let milestones = project ? await listProjectMilestones(project.id) : [];

    if (project && milestones.length > 0) {
      const steps = milestonesToProjectSteps(milestones);
      const drift = Math.abs(computeProgressFromMilestones(steps) - project.progress);
      if (drift > MILESTONE_PROGRESS_DRIFT_THRESHOLD) {
        await syncProjectMilestonesToProgress(project.id, project.progress);
        milestones = await listProjectMilestones(project.id);
      }
    }

    return { client, project, milestones };
  } catch (error) {
    console.error("[client-portal-db] loadPortalCrmContext", error);
    return null;
  }
}

export function mergeProfileWithCrm(
  portalClientId: string,
  crm: PortalCrmContext | null,
): ClientProfileData {
  const envProfile = buildClientProfile(portalClientId);
  const envOverride = parseClientPortalConfig()[portalClientId]?.profile ?? {};

  if (!crm) {
    return { ...envProfile, linkedToCrm: false };
  }

  const { client, project } = crm;
  const paidFromMeta =
    readAmount(client.metadata?.paidAmount) ??
    readAmount(project?.metadata?.paidAmount);

  const name = client.name || envOverride.name || envProfile.name;
  const company = client.company || envOverride.company || envProfile.company;

  if (!project) {
    return {
      ...envProfile,
      clientId: portalClientId,
      crmClientId: client.id,
      linkedToCrm: true,
      name,
      company,
      initials: envOverride.initials ?? initialsFromName(name),
    };
  }

  const totalAmount = project.budget ?? envOverride.totalAmount ?? envProfile.totalAmount;
  const paidAmount = paidFromMeta ?? envOverride.paidAmount ?? envProfile.paidAmount;

  const steps =
    crm.milestones.length > 0 ? milestonesToProjectSteps(crm.milestones) : null;
  const baseStatus = PORTAL_STATUS_LABELS[project.status];
  const aligned = alignProjectDisplay(project.progress, baseStatus, steps);

  return {
    clientId: portalClientId,
    crmClientId: client.id,
    crmProjectId: project.id,
    linkedToCrm: true,
    name,
    company,
    initials: envOverride.initials ?? initialsFromName(name),
    projectTitle: project.name,
    projectType: PROJECT_TYPE_LABELS[project.type],
    projectStatus: aligned.statusLabel,
    progress: aligned.progress,
    startDate: formatProjectDate(project.startDate),
    endDate: formatProjectDate(project.dueDate),
    totalAmount,
    paidAmount: Math.min(paidAmount, totalAmount),
  };
}

export async function loadPortalProjectPayload(portalClientId: string): Promise<PortalProjectPayload> {
  const crm = await loadPortalCrmContext(portalClientId);

  if (!crm?.project) {
    return {
      linked: Boolean(crm),
      crmClientId: crm?.client.id ?? null,
      crmProjectId: null,
      project: null,
      milestones: [],
    };
  }

  const { client, project, milestones } = crm;
  const steps = milestonesToProjectSteps(milestones);
  const baseStatus = PORTAL_STATUS_LABELS[project.status];
  const aligned = alignProjectDisplay(project.progress, baseStatus, steps);
  const displaySteps = resolvePortalProjectSteps(project.progress, steps);

  return {
    linked: true,
    crmClientId: client.id,
    crmProjectId: project.id,
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      typeLabel: PROJECT_TYPE_LABELS[project.type],
      status: project.status,
      statusLabel: aligned.statusLabel,
      progress: aligned.progress,
      startDate: project.startDate,
      dueDate: project.dueDate,
      budget: project.budget,
      description: project.description,
    },
    milestones: displaySteps,
  };
}

export async function buildClientProfileAsync(portalClientId: string): Promise<ClientProfileData> {
  const crm = await loadPortalCrmContext(portalClientId);
  return mergeProfileWithCrm(portalClientId, crm);
}

export async function loadPortalPaymentsPayload(portalClientId: string): Promise<PortalPaymentsPayload> {
  const envProfile = buildClientProfile(portalClientId);
  const crm = await loadPortalCrmContext(portalClientId);

  return buildPortalPaymentsPayload({
    client: crm?.client ?? null,
    project: crm?.project ?? null,
    fallbackTotal: envProfile.totalAmount,
    fallbackPaid: envProfile.paidAmount,
    fallbackEndDate: envProfile.endDate,
  });
}
