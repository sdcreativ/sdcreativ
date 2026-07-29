import { NextResponse } from "next/server";
import { RSVP_STATUS_LABELS } from "@/lib/calendar-participants-shared";
import { listRecentRsvpResponses } from "@/lib/calendar-participants";
import {
  INVITATION_LOG_STATUS_LABELS,
  listRecentInvitationDeliveryIssues,
} from "@/lib/calendar-invitation-logs";
import { isDatabaseConfigured } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { listFiredReminderKeys, markRemindersFired } from "@/lib/crm-reminders";

/**
 * Digest matinal : réponses RSVP + bounces/échecs Resend (24 h).
 * Auth : Authorization: Bearer CRON_SECRET
 * À planifier vers 8 h : GET /api/cron/calendar-digest
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const digestKey = `calendar-digest:${dayKey}`;
    const fired = await listFiredReminderKeys([digestKey]);
    if (fired.has(digestKey)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Déjà envoyé aujourd’hui" });
    }

    const since = new Date(now.getTime() - 24 * 60 * 60_000);
    const rsvps = await listRecentRsvpResponses(since);
    const issues = await listRecentInvitationDeliveryIssues(since);

    if (rsvps.length === 0 && issues.length === 0) {
      await markRemindersFired([
        {
          key: digestKey,
          itemId: "digest",
          itemType: "digest",
          title: "Digest calendrier",
          triggerAt: now.toISOString(),
          channels: ["email"],
        },
      ]);
      return NextResponse.json({ ok: true, sent: false, rsvps: 0, issues: 0 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const rsvpHtml =
      rsvps.length === 0
        ? "<p>Aucune nouvelle réponse RSVP.</p>"
        : `<ul>${rsvps
            .map((r) => {
              const who = r.name?.trim() || r.email;
              return `<li><strong>${escapeHtml(who)}</strong> → ${escapeHtml(RSVP_STATUS_LABELS[r.status])} — ${escapeHtml(r.eventTitle)}</li>`;
            })
            .join("")}</ul>`;

    const issuesHtml =
      issues.length === 0
        ? "<p>Aucun bounce / échec d’envoi.</p>"
        : `<ul>${issues
            .map(
              (i) =>
                `<li><strong>${escapeHtml(i.email)}</strong> — ${escapeHtml(INVITATION_LOG_STATUS_LABELS[i.status])} — ${escapeHtml(i.eventTitle)}${i.error ? ` (${escapeHtml(i.error)})` : ""}</li>`,
            )
            .join("")}</ul>`;

    const ok = await sendEmail({
      subject: `[CRM] Digest calendrier — ${rsvps.length} RSVP, ${issues.length} incident(s)`,
      html: `<p>Résumé des dernières 24 h :</p>
        <h3>Réponses RSVP</h3>${rsvpHtml}
        <h3>Délivrabilité (Resend)</h3>${issuesHtml}
        <p><a href="${escapeHtml(`${siteUrl.replace(/\/$/, "")}/admin/crm/calendrier`)}">Ouvrir le calendrier</a></p>`,
    });

    if (!ok) {
      return NextResponse.json({ error: "Envoi digest impossible." }, { status: 502 });
    }

    await markRemindersFired([
      {
        key: digestKey,
        itemId: "digest",
        itemType: "digest",
        title: "Digest calendrier",
        triggerAt: now.toISOString(),
        channels: ["email"],
      },
    ]);

    return NextResponse.json({
      ok: true,
      sent: true,
      rsvps: rsvps.length,
      issues: issues.length,
    });
  } catch (error) {
    console.error("[api/cron/calendar-digest] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
