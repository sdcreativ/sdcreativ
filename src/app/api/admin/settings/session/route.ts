import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import {
  ensureCrmRolesCache,
  getCachedRoleLabel,
} from "@/lib/crm-roles-db";
import { getRolePermissions } from "@/lib/crm-permissions";
import { getCrmUserProfile } from "@/lib/crm-user-profile";
import { isCrmMessagerieUiEnabled } from "@/lib/mail/config";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  await ensureCrmRolesCache();
  const profile =
    session.userId !== "legacy"
      ? await getCrmUserProfile(session.userId)
      : { avatarUrl: null, dashboardLayout: null };

  return NextResponse.json({
    session: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      roleLabel: getCachedRoleLabel(session.role),
      permissions: getRolePermissions(session.role),
      avatarUrl: profile.avatarUrl,
      dashboardLayout: profile.dashboardLayout,
      messagerieEnabled: isCrmMessagerieUiEnabled(),
    },
  });
}
