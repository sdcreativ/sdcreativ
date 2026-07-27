import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { uploadCalendarAttachment } from "@/lib/calendar-attachments";

export async function POST(request: Request) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadCalendarAttachment(
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );

    return NextResponse.json({ attachment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload impossible.";
    console.error("[api/admin/calendar/attachments]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
