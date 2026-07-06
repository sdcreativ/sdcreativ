import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { logCrmAudit } from "@/lib/crm-audit";

export async function auditCrmAction(input: {
  action: string;
  entityType: string;
  summary: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const session = await getAdminSession();
  if (!session) return;
  await logCrmAudit({
    actor: {
      userId: session.userId === "legacy" ? null : session.userId,
      name: session.name,
      email: session.email,
    },
    ...input,
  });
}

export function usersManageAuth() {
  return requireAdminAuth({ permission: "users.manage" });
}
