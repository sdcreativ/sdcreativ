import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listActiveTeamNames } from "@/lib/crm-users";
import { CRM_TEAM_MEMBERS } from "@/content/crm-team";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ names: [...CRM_TEAM_MEMBERS] });
  }

  try {
    const names = await listActiveTeamNames();
    return NextResponse.json({
      names: names.length > 0 ? names : [...CRM_TEAM_MEMBERS],
    });
  } catch (error) {
    console.error("[api/admin/users/team] GET", error);
    return NextResponse.json({ names: [...CRM_TEAM_MEMBERS] });
  }
}
