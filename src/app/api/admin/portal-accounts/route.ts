import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  listClientPortalAccounts,
  parseClientPortalConfig,
} from "@/lib/client-portal-config";
import { loadPortalCrmContext } from "@/lib/client-portal-db";
import { isDatabaseConfigured } from "@/lib/db";
import { listClients } from "@/lib/clients";

export type PortalAccountStatus = {
  id: string;
  label: string;
  company: string;
  hasEnvToken: boolean;
  linkedToCrm: boolean;
  hasCrmProject: boolean;
  crmClientId: string | null;
  crmProjectId: string | null;
};

/** Comptes espace client (env + CRM) — pour documents S3 et état de sync. */
export async function GET() {
  const authError = await crmApiAuth.settings.read();
  if (authError) return authError;

  const envConfig = parseClientPortalConfig();
  const fromEnv = listClientPortalAccounts();
  const merged = new Map<string, PortalAccountStatus>();

  for (const item of fromEnv) {
    merged.set(item.id, {
      id: item.id,
      label: item.label,
      company: item.company,
      hasEnvToken: true,
      linkedToCrm: false,
      hasCrmProject: false,
      crmClientId: null,
      crmProjectId: null,
    });
  }

  if (isDatabaseConfigured()) {
    try {
      const crmClients = await listClients();
      for (const client of crmClients) {
        if (!client.portalClientId) continue;

        const existing = merged.get(client.portalClientId);
        const ctx = await loadPortalCrmContext(client.portalClientId);

        merged.set(client.portalClientId, {
          id: client.portalClientId,
          label: client.company || client.name,
          company: client.company || client.name,
          hasEnvToken: Boolean(envConfig[client.portalClientId]),
          linkedToCrm: Boolean(ctx),
          hasCrmProject: Boolean(ctx?.project),
          crmClientId: client.id,
          crmProjectId: ctx?.project?.id ?? null,
        });
      }
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ clients: [...merged.values()] });
}
