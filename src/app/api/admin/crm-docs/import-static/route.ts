import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { importStaticCrmDocs } from "@/lib/crm-docs";

export async function POST() {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const result = await importStaticCrmDocs();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/crm-docs/import-static]", error);
    return NextResponse.json({ error: "Import impossible." }, { status: 500 });
  }
}
