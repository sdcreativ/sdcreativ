import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getCalendarEventById } from "@/lib/calendar";
import {
  createCalendarAttachmentAccessUrl,
  loadCalendarAttachmentBuffer,
} from "@/lib/calendar-attachments";

type Props = { params: Promise<{ id: string }> };

/** Télécharge une pièce jointe d’événement (`?index=0` pour multi-PJ). */
export async function GET(request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  try {
    const { id } = await params;
    const event = await getCalendarEventById(id);
    const files = event?.attachments?.length
      ? event.attachments
      : event?.attachment
        ? [event.attachment]
        : [];
    if (files.length === 0) {
      return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
    }

    const url = new URL(request.url);
    const rawIndex = url.searchParams.get("index");
    const index = rawIndex == null ? 0 : Number.parseInt(rawIndex, 10);
    if (!Number.isFinite(index) || index < 0 || index >= files.length) {
      return NextResponse.json({ error: "Index de pièce jointe invalide." }, { status: 400 });
    }

    const attachment = files[index]!;
    const buffer = await loadCalendarAttachmentBuffer(attachment);
    if (buffer && buffer.length > 0) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": attachment.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${attachment.name.replace(/"/g, "")}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const signed = await createCalendarAttachmentAccessUrl(attachment);
    if (signed && signed !== attachment.url) {
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
