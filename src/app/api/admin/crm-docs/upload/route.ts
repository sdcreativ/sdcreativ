import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { uploadCrmDocImage } from "@/lib/crm-docs-media";

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, storage, key } = await uploadCrmDocImage(
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );
    return NextResponse.json({ url, storage, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload impossible.";
    console.error("[api/admin/crm-docs/upload]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
