import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/lead-activities";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
  });
}
