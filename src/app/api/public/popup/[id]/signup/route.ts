import { NextResponse } from "next/server";
import { escapeHtml, htmlRow, sendEmail } from "@/lib/email";
import { rejectIfBot } from "@/lib/form-guard";
import { createLead } from "@/lib/leads";
import { upsertNewsletterSubscriber } from "@/lib/marketing-subscribers";
import { PUBLIC_FORM_RATE_LIMIT, consumeRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";
import { attachSignupLead, createPopupSignup, getActivePopupById } from "@/lib/site-popups";
import { popupSignupSchema } from "@/lib/site-popups-types";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { isDatabaseConfigured } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Inscription depuis un popup : code personnel, abonné marketing, lead CRM (source « popup »),
 * e-mail au visiteur avec son code + notification interne.
 */
export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Popup introuvable." }, { status: 404 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Service indisponible." }, { status: 503 });

  const limited = consumeRateLimit("public-popup-signup", getClientIp(request), PUBLIC_FORM_RATE_LIMIT);
  if (limited.limited) return rateLimitExceededResponse(limited.retryAfterSec);

  const body = await request.json().catch(() => null);
  const rejected = await rejectIfBot(body);
  if (rejected) return rejected;

  const parsed = popupSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }
  const data = parsed.data;

  const popup = await getActivePopupById(id);
  if (!popup) return NextResponse.json({ error: "Cette offre n'est plus disponible." }, { status: 410 });

  try {
    const { signup, reused } = await createPopupSignup(popup, data);

    if (!reused) {
      await upsertNewsletterSubscriber({ email: data.email, source: "popup" }).catch((err) =>
        console.error("[popup/signup] newsletter", err),
      );
      const lead = await createLead({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        source: "popup",
        status: "new",
        service: data.projectType ?? null,
        message: `Code avantage ${signup.code} — ${popup.offerLabel}`,
        marketingOptIn: true,
        metadata: { popupId: popup.id, popupName: popup.name, promoCode: signup.code, pagePath: data.pagePath ?? null },
      });
      if (lead) await attachSignupLead(signup.id, lead.id);
    }

    const site = await getSitePublicSettings();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(/\/$/, "");
    const devisUrl = `${siteUrl}${popup.locale === "en" ? "/en/devis" : "/devis"}?code=${encodeURIComponent(signup.code)}`;
    const expires = new Date(signup.codeExpiresAt).toLocaleDateString(popup.locale === "en" ? "en-GB" : "fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const whatsappDigits = site.contact.whatsapp.replace(/\D/g, "");
    const whatsappUrl = whatsappDigits
      ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Bonjour, j'ai le code ${signup.code} (${popup.offerLabel}).`)}`
      : "";

    await sendEmail({
      to: data.email,
      subject: `Votre code avantage SD CREATIV : ${signup.code}`,
      html: `
        <p>Bonjour ${escapeHtml(data.name)},</p>
        <p>Voici votre code personnel : <strong style="font-size:20px;letter-spacing:2px">${escapeHtml(signup.code)}</strong></p>
        <p>Avantage : <strong>${escapeHtml(popup.offerLabel)}</strong>, valable jusqu'au ${escapeHtml(expires)}.</p>
        <p><a href="${devisUrl}">Utiliser mon code dans ma demande de devis</a></p>
        ${whatsappUrl ? `<p>Ou écrivez-nous sur <a href="${whatsappUrl}">WhatsApp</a> en mentionnant votre code.</p>` : ""}
        <p>À très vite,<br>L'équipe SD CREATIV</p>
      `,
    }).catch((err) => console.error("[popup/signup] email visiteur", err));

    if (!reused) {
      await sendEmail({
        replyTo: data.email,
        subject: `[SD CREATIV] Nouvelle inscription popup — ${data.name}`,
        html: `
          <h2>Inscription via le popup « ${escapeHtml(popup.name)} »</h2>
          ${htmlRow("Nom", data.name)}
          ${htmlRow("E-mail", data.email)}
          ${htmlRow("WhatsApp / téléphone", data.phone)}
          ${htmlRow("Type de projet", data.projectType)}
          ${htmlRow("Code", signup.code)}
          ${htmlRow("Avantage", popup.offerLabel)}
          ${htmlRow("Page", data.pagePath)}
        `,
      }).catch((err) => console.error("[popup/signup] notification", err));
    }

    return NextResponse.json({ code: signup.code, expiresAt: signup.codeExpiresAt, devisUrl, whatsappUrl });
  } catch (error) {
    console.error("[api/public/popup/signup]", error);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez plus tard." }, { status: 500 });
  }
}
