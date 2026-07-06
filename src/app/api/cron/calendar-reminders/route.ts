import { NextResponse } from "next/server";
import { listCalendarItems } from "@/lib/calendar";
import { buildRemindersForItems } from "@/lib/calendar-reminders";
import {
  listUsersWithCalendarEmailEnabled,
  listUsersWithCalendarSmsEnabled,
  shouldSendEmailReminder,
  shouldSendSmsReminder,
} from "@/lib/calendar-user-preferences";
import { isDatabaseConfigured } from "@/lib/db";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

const GRACE_MS = 10 * 60_000;

/** Cron externe (VPS) — envoie les rappels email et SMS selon préférences utilisateur. */
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
    const from = new Date(now);
    from.setDate(from.getDate() - 1);
    const to = new Date(now);
    to.setDate(to.getDate() + 7);

    const items = await listCalendarItems(from, to);
    const due = buildRemindersForItems(items, now, GRACE_MS);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";

    const emailFired = await listFiredReminderKeysForChannel(due.map((r) => r.key), "email");
    const emailPending = due.filter((r) => !emailFired.has(r.key));

    const smsFired = await listFiredReminderKeysForChannel(due.map((r) => r.key), "sms");
    const smsPending = due.filter((r) => !smsFired.has(r.key));

    let emailsSent = 0;
    let smsSent = 0;

    if (emailPending.length > 0) {
      const users = await listUsersWithCalendarEmailEnabled();

      if (users.length === 0) {
        const html = emailPending.map((r) => `<li><strong>${r.message}</strong></li>`).join("");
        const ok = await sendEmail({
          subject: `[SD CREATIV CRM] ${emailPending.length} rappel(s) calendrier`,
          html: `<p>Rappels calendrier :</p><ul>${html}</ul><p><a href="${siteUrl}/admin/crm/calendrier">Ouvrir le calendrier</a></p>`,
        });
        if (ok) emailsSent = emailPending.length;
      } else {
        for (const user of users) {
          const userReminders = emailPending.filter((r) => {
            if (!shouldSendEmailReminder(user.preferences, r.itemType)) return false;
            const item = items.find((i) => i.id === r.itemId);
            if (!item?.assignee) return true;
            return item.assignee === user.name;
          });

          if (userReminders.length === 0) continue;

          const html = userReminders
            .map(
              (r) =>
                `<li><strong>${r.message}</strong>${r.description ? `<br/><em>${r.description}</em>` : ""}</li>`,
            )
            .join("");

          const ok = await sendEmail({
            to: user.email,
            subject: `[CRM] ${userReminders.length} rappel(s) calendrier`,
            html: `<p>Bonjour ${user.name},</p><p>Vos rappels calendrier :</p><ul>${html}</ul><p><a href="${siteUrl}/admin/crm/calendrier">Ouvrir le calendrier</a></p>`,
          });

          if (ok) emailsSent += userReminders.length;
        }
      }

      await markRemindersFired(
        emailPending.map((r) => ({
          key: r.key,
          itemId: r.itemId,
          itemType: r.itemType,
          title: r.title,
          triggerAt: r.triggerAt,
          channels: ["email"],
        })),
      );
    }

    if (smsPending.length > 0) {
      const smsUsers = await listUsersWithCalendarSmsEnabled();

      for (const user of smsUsers) {
        const userReminders = smsPending.filter((r) => {
          if (!shouldSendSmsReminder(user.preferences, r.itemType)) return false;
          const item = items.find((i) => i.id === r.itemId);
          if (!item?.assignee) return true;
          return item.assignee === user.name;
        });

        for (const reminder of userReminders) {
          const ok = await sendSms(user.phone, `[CRM] ${reminder.message}`);
          if (ok) smsSent += 1;
        }
      }

      if (smsSent > 0) {
        await markRemindersFired(
          smsPending.map((r) => ({
            key: r.key,
            itemId: r.itemId,
            itemType: r.itemType,
            title: r.title,
            triggerAt: r.triggerAt,
            channels: ["sms"],
          })),
        );
      }
    }

    return NextResponse.json({
      emailsSent,
      smsSent,
      emailPending: emailPending.length,
      smsPending: smsPending.length,
    });
  } catch (error) {
    console.error("[api/cron/calendar-reminders] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
