import { NextResponse } from "next/server";
import { attributionFromBody, CHANNEL_LABELS, leadChannel } from "@/lib/attribution";
import { htmlRow, sendEmail } from "@/lib/email";
import { createLead } from "@/lib/leads";
import { rejectIfBot } from "@/lib/form-guard";
import {
  PUBLIC_FORM_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { landingLeadSchema } from "@/lib/validations/landing";

/** Demande d'audit gratuit depuis la page publicité : prospect au CRM avec sa provenance, puis alerte interne. */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = consumeRateLimit("public-landing", ip, PUBLIC_FORM_RATE_LIMIT);
    if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

    const body = await request.json();

    const rejected = await rejectIfBot(body);
    if (rejected) return rejected;

    const parsed = landingLeadSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { firstName, whatsapp, email, company, website } = parsed.data;
    const attribution = attributionFromBody(body);
    const channel = leadChannel(attribution);
    const touch = attribution?.last ?? attribution?.first;

    const lead = await createLead({
      name: firstName,
      email,
      phone: whatsapp,
      company: company || null,
      source: "landing",
      service: "Audit web gratuit",
      message: website ? `Site actuel : ${website}` : null,
      metadata: { channel: "landing_audit", website: website || null },
      attribution,
    });

    const sent = await sendEmail({
      replyTo: email,
      subject: `[SD CREATIV] Audit gratuit (publicité) — ${firstName}`,
      html: `
        <h2>Nouvelle demande d'audit gratuit via la page publicité</h2>
        ${htmlRow("Prénom", firstName)}
        ${htmlRow("WhatsApp", whatsapp)}
        ${htmlRow("Email", email)}
        ${htmlRow("Entreprise", company)}
        ${htmlRow("Site actuel", website)}
        ${htmlRow("Origine", channel ? CHANNEL_LABELS[channel] : null)}
        ${htmlRow("Campagne", touch?.campaign)}
        ${htmlRow("Annonce", touch?.content)}
      `,
    });

    // Le prospect enregistré au CRM suffit : l'alerte e-mail n'est qu'une notification.
    if (!lead && !sent) {
      return NextResponse.json(
        { error: "Impossible d'envoyer votre demande. Réessayez ou écrivez-nous sur WhatsApp." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
