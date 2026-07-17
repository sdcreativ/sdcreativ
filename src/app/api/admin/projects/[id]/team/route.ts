import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listProjectTeamMembers, setProjectTeamMembers } from "@/lib/project-team";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const { id } = await params;
  return NextResponse.json({ members: await listProjectTeamMembers(id) });
}

export async function PUT(request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = z.object({ userIds: z.array(z.string().uuid()) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userIds invalides." }, { status: 400 });
  }
  const members = await setProjectTeamMembers(id, parsed.data.userIds);
  return NextResponse.json({ members });
}
