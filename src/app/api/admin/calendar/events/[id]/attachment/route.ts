import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getCalendarEventById } from "@/lib/calendar";
import {
  createCalendarAttachmentAccessUrl,
  loadCalendarAttachmentBuffer,
} from "@/lib/calendar-attachments";

type Props = { params: Promise<{ id: string }> };

/** Télécharge la pièce jointe d’un événement (stream authentifié CRM). */
export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  try {
    const { id } = await params;
    const event = await getCalendarEventById(id);
    if (!event?.attachment) {
      return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
    }

    const buffer = await loadCalendarAttachmentBuffer(event.attachment);
    if (buffer && buffer.length > 0) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": event.attachment.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${event.attachment.name.replace(/"/g, "")}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const signed = await createCalendarAttachmentAccessUrl(event.attachment);
    if (signed && signed !== event.attachment.url) {
      return NextResponse.redirect(signed);
    }

    return NextResponse.json(
      { error: "Fichier inaccessible (vérifiez S3 / uploads)." },
      { status: 404 },
    );
  } catch (error) {
    console.error("[api/admin/calendar/events/id/attachment]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
