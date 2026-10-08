import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteSitePopup, updateSitePopup } from "@/lib/site-popups";
import { updateSitePopupSchema } from "@/lib/site-popups-types";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  const parsed = updateSitePopupSchema.safeParse(await request.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".")} : ${issue.message}` : "Données invalides." }, { status: 400 });
  }
  const popup = await updateSitePopup(id, parsed.data);
  if (!popup) return NextResponse.json({ error: "Popup introuvable." }, { status: 404 });
  return NextResponse.json({ popup });
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { id } = await params;
  if (!(await deleteSitePopup(id))) return NextResponse.json({ error: "Popup introuvable." }, { status: 404 });
  return NextResponse.json({ success: true });
}
