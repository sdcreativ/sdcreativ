import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { uploadSiteLogo } from "@/lib/site-logo-media";

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, storage } = await uploadSiteLogo(
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );

    return NextResponse.json({ url, storage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload impossible.";
    console.error("[api/admin/site-public/logo/upload]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
