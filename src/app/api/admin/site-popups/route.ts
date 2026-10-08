import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createSitePopup, listSitePopups } from "@/lib/site-popups";
import { createSitePopupSchema } from "@/lib/site-popups-types";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  return NextResponse.json({ popups: await listSitePopups() });
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const parsed = createSitePopupSchema.safeParse(await request.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".")} : ${issue.message}` : "Données invalides." }, { status: 400 });
  }
  return NextResponse.json({ popup: await createSitePopup(parsed.data) }, { status: 201 });
}
