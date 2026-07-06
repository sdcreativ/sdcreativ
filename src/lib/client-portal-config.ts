import { z } from "zod";

export type ClientProfileData = {
  clientId: string;
  name: string;
  company: string;
  initials: string;
  projectTitle: string;
  projectType: string;
  projectStatus: string;
  progress: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAmount: number;
  /** Fiche client CRM liée (UUID) */
  crmClientId?: string;
  /** Projet CRM actif (UUID) */
  crmProjectId?: string;
  /** Données synchronisées depuis PostgreSQL */
  linkedToCrm?: boolean;
};

const profileFieldsSchema = z.object({
  name: z.string().trim().min(1).optional(),
  company: z.string().trim().min(1).optional(),
  initials: z.string().trim().min(1).max(4).optional(),
  projectTitle: z.string().trim().min(1).optional(),
  projectType: z.string().trim().min(1).optional(),
  projectStatus: z.string().trim().min(1).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
  totalAmount: z.number().int().positive().optional(),
  paidAmount: z.number().int().min(0).optional(),
});

const entryObjectSchema = profileFieldsSchema.extend({
  token: z.string().trim().min(8),
});

export type ClientPortalEntry = {
  token: string;
  profile: z.infer<typeof profileFieldsSchema>;
};

const defaultProfile: Omit<ClientProfileData, "clientId" | "company"> = {
  name: "",
  initials: "?",
  projectTitle: "",
  projectType: "Projet",
  projectStatus: "—",
  progress: 0,
  startDate: "—",
  endDate: "—",
  totalAmount: 0,
  paidAmount: 0,
};

function slugToLabel(clientId: string): string {
  return clientId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function parseClientPortalConfig(): Record<string, ClientPortalEntry> {
  const raw = process.env.CLIENT_PORTAL_TOKENS;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};

    const entries: Record<string, ClientPortalEntry> = {};

    for (const [clientId, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim().length >= 8) {
        entries[clientId] = { token: value.trim(), profile: {} };
        continue;
      }

      if (typeof value === "object" && value !== null) {
        const result = entryObjectSchema.safeParse(value);
        if (!result.success) continue;

        const { token, ...profile } = result.data;
        entries[clientId] = { token, profile };
      }
    }

    return entries;
  } catch {
    return {};
  }
}

export function parseClientPortalTokens(): Record<string, string> {
  const config = parseClientPortalConfig();
  return Object.fromEntries(
    Object.entries(config).map(([clientId, entry]) => [clientId, entry.token]),
  );
}

export function buildClientProfile(clientId: string): ClientProfileData {
  const config = parseClientPortalConfig();
  const entry = config[clientId];
  const override = entry?.profile ?? {};
  const company = override.company ?? slugToLabel(clientId);
  const name = override.name ?? company;
  const projectType = override.projectType ?? defaultProfile.projectType;

  const profile: ClientProfileData = {
    clientId,
    name,
    company,
    initials: override.initials ?? initialsFromName(name || company),
    projectTitle: override.projectTitle ?? `${projectType} — ${company}`,
    projectType,
    projectStatus: override.projectStatus ?? defaultProfile.projectStatus,
    progress: override.progress ?? defaultProfile.progress,
    startDate: override.startDate ?? defaultProfile.startDate,
    endDate: override.endDate ?? defaultProfile.endDate,
    totalAmount: override.totalAmount ?? defaultProfile.totalAmount,
    paidAmount: override.paidAmount ?? defaultProfile.paidAmount,
  };

  if (profile.paidAmount > profile.totalAmount) {
    profile.paidAmount = profile.totalAmount;
  }

  return profile;
}

export function listClientPortalAccounts(): Array<{
  id: string;
  label: string;
  company: string;
}> {
  return Object.keys(parseClientPortalConfig())
    .sort()
    .map((id) => {
      const profile = buildClientProfile(id);
      return { id, label: profile.company, company: profile.company };
    });
}

export function validateClientCredentials(clientId: string, token: string): boolean {
  const config = parseClientPortalConfig();
  return config[clientId]?.token === token;
}
