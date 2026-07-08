import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { importStaticFaqItems } from "@/lib/public-faq-items";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateFaqPages } from "@/lib/site-revalidate";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const result = await importStaticFaqItems();
    if (result.imported > 0) revalidateFaqPages();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import impossible.";
    console.error("[api/admin/faq-items/import-static] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
