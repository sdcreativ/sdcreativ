import { escapeHtml, sendEmail } from "@/lib/email";
import { isEmailUnsubscribed } from "@/lib/email-unsubscribe";
import { listSignupsForReminders, markSignupReminded, type PopupSignup } from "@/lib/site-popups";
import { dueReminderStage } from "@/lib/site-popups-types";

export type PopupReminderResult = { sent: number; skipped: number; failed: number };

function daysLeft(expiresAt: string, now: number): number {
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000));
}

/** E-mail de relance : rappel du code (J+3), puis « dernière chance » avant expiration (J+20). */
export function buildPopupReminderEmail(signup: PopupSignup, stage: number, now: number) {
  const en = signup.locale === "en";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(/\/$/, "");
  const devisUrl = `${siteUrl}${en ? "/en/devis" : "/devis"}?code=${encodeURIComponent(signup.code)}`;
  const left = daysLeft(signup.codeExpiresAt, now);
  const code = `<strong style="font-size:18px;letter-spacing:2px">${escapeHtml(signup.code)}</strong>`;
  const offer = escapeHtml(signup.offerLabel);
  const name = escapeHtml(signup.name);

  if (en) {
    return {
      subject: stage === 0 ? `Your SD CREATIV code ${signup.code} is waiting` : `${left} days left to use your code ${signup.code}`,
      html: `<p>Hello ${name},</p>
        <p>${stage === 0 ? "Your personal code is still available" : `Your code expires in <strong>${left} days</strong>`}: ${code}</p>
        <p>Benefit: <strong>${offer}</strong>.</p>
        <p><a href="${devisUrl}">Request my quote with my code</a> — it only takes 2 minutes.</p>
        <p>Best regards,<br>The SD CREATIV team</p>`,
    };
  }
  return {
    subject:
      stage === 0
        ? `Votre code ${signup.code} vous attend`
        : `Plus que ${left} jours pour utiliser votre code ${signup.code}`,
    html: `<p>Bonjour ${name},</p>
      <p>${stage === 0 ? "Votre code personnel est toujours disponible" : `Votre code expire dans <strong>${left} jours</strong>`} : ${code}</p>
      <p>Avantage : <strong>${offer}</strong>.</p>
      <p><a href="${devisUrl}">Demander mon devis avec mon code</a> — 2 minutes suffisent.</p>
      <p>Une question ? Répondez simplement à cet e-mail.</p>
      <p>À très vite,<br>L'équipe SD CREATIV</p>`,
  };
}

/** Cron quotidien : relance les inscrits dont le code n'a pas servi (J+3 puis J+20). */
export async function processPopupReminders(now = Date.now()): Promise<PopupReminderResult> {
  const result: PopupReminderResult = { sent: 0, skipped: 0, failed: 0 };
  for (const signup of await listSignupsForReminders()) {
    const due = dueReminderStage(signup, now);
    if (!due) continue;
    if (await isEmailUnsubscribed(signup.email)) {
      result.skipped += 1;
      continue;
    }
    const { subject, html } = buildPopupReminderEmail(signup, due.stage, now);
    const ok = await sendEmail({
      to: signup.email,
      subject,
      html,
      unsubscribe: { email: signup.email, locale: signup.locale === "en" ? "en" : "fr" },
    });
    if (!ok) {
      result.failed += 1;
      continue;
    }
    await markSignupReminded(signup.id, due.nextCount);
    result.sent += 1;
  }
  return result;
}
