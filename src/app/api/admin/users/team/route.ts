import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listActiveTeamNames } from "@/lib/crm-users";
import { listActiveCrmUsers } from "@/lib/crm-assignee";
import { CRM_TEAM_MEMBERS } from "@/content/crm-team";

export async function GET(request: Request) {
  const authError = await crmApiAuth.session();
  if (authError) return authError;

  const withIds = new URL(request.url).searchParams.get("withIds") === "1";

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      names: [...CRM_TEAM_MEMBERS],
      members: CRM_TEAM_MEMBERS.map((name, i) => ({ id: `legacy-${i}`, name })),
    });
  }

  try {
    if (withIds) {
      const users = await listActiveCrmUsers();
      const members = users.map((u) => ({ id: u.id, name: u.name }));
      return NextResponse.json({
        members: members.length > 0 ? members : CRM_TEAM_MEMBERS.map((name, i) => ({ id: `legacy-${i}`, name })),
        names: members.length > 0 ? members.map((m) => m.name) : [...CRM_TEAM_MEMBERS],
      });
    }
    const names = await listActiveTeamNames();
    return NextResponse.json({
      names: names.length > 0 ? names : [...CRM_TEAM_MEMBERS],
    });
  } catch (error) {
    console.error("[api/admin/users/team] GET", error);
    return NextResponse.json({ names: [...CRM_TEAM_MEMBERS] });
  }
}
