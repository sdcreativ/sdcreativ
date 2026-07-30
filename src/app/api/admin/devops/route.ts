import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getDevopsGithubSnapshot } from "@/lib/devops-github";

export async function GET() {
  const authError = await crmApiAuth.infra.read();
  if (authError) return authError;

  try {
    const devops = await getDevopsGithubSnapshot();
    return NextResponse.json(
      { devops },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    console.error("[api/admin/devops] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
