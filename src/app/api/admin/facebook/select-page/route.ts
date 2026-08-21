import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { selectFacebookPage } from "@/lib/facebook-page";

const bodySchema = z.object({
  pageId: z.string().min(1),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "pageId requis." }, { status: 400 });
    }
    const status = await selectFacebookPage(parsed.data.pageId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("[api/admin/facebook/select-page] POST", error);
    const message = error instanceof Error ? error.message : "Sélection impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
