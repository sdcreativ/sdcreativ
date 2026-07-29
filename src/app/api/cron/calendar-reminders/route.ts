import { NextResponse } from "next/server";
import { stripHtml } from "@/lib/blog-content";
import { listCalendarItems, getCalendarEventById } from "@/lib/calendar";
import { loadCalendarAttachmentBuffer } from "@/lib/calendar-attachments";
import { buildRemindersForItems } from "@/lib/calendar-reminders";
import {
  listUsersWithCalendarEmailEnabled,
  listUsersWithCalendarSmsEnabled,
  shouldSendEmailReminder,
  shouldSendSmsReminder,
} from "@/lib/calendar-user-preferences";
import { isDatabaseConfigured } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

const GRACE_MS = 10 * 60_000;

function reminderDescriptionHtml(description: string | null): string {
  if (!description?.trim()) return "";
  const plain = stripHtml(description).trim().slice(0, 400);
  if (!plain) return "";
  return `<br/><em>${escapeHtml(plain)}</em>`;
}

function reminderAttachmentsHtml(names: string[]): string {
  if (names.length === 0) return "";
  const label = names.length > 1 ? "Pièces jointes" : "Pièce jointe";
  return `<br/><span>${label} : ${escapeHtml(names.join(", "))}</span>`;
}

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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";

    let emailsSent = 0;
    let smsSent = 0;
    const firedEmailKeys: string[] = [];
    const firedSmsKeys: Array<{
      key: string;
      itemId: string;
      itemType: string;
      title: string;
      triggerAt: string;
    }> = [];

    const emailUsers = await listUsersWithCalendarEmailEnabled();

    if (emailUsers.length === 0) {
      const due = buildRemindersForItems(items, now, GRACE_MS);
      const emailFired = await listFiredReminderKeysForChannel(
        due.map((r) => r.key),
        "email",
      );
      const emailPending = due.filter((r) => !emailFired.has(r.key));
      if (emailPending.length > 0) {
        const html = emailPending
          .map(
            (r) =>
              `<li><strong>${escapeHtml(r.message)}</strong>${reminderDescriptionHtml(r.description)}${reminderAttachmentsHtml(r.attachmentNames)}</li>`,
          )
          .join("");
        const ok = await sendEmail({
          subject: `[SD CREATIV CRM] ${emailPending.length} rappel(s) calendrier`,
          html: `<p>Rappels calendrier :</p><ul>${html}</ul><p><a href="${siteUrl}/admin/crm/calendrier">Ouvrir le calendrier</a></p>`,
        });
        if (ok) {
          emailsSent = emailPending.length;
          firedEmailKeys.push(...emailPending.map((r) => r.key));
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
      }
    } else {
      for (const user of emailUsers) {
        const due = buildRemindersForItems(items, now, GRACE_MS, {
          shortMinutes: user.preferences.defaultLeadMinutes,
          offsets: user.preferences.offsets,
        });
        const emailFired = await listFiredReminderKeysForChannel(
          due.map((r) => r.key),
          "email",
        );

        const userReminders = due.filter((r) => {
          if (emailFired.has(r.key)) return false;
          if (!shouldSendEmailReminder(user.preferences, r.itemType)) return false;
          const item = items.find((i) => i.id === r.itemId);
          if (!item?.assignee) return true;
          return item.assignee === user.name;
        });

        if (userReminders.length === 0) continue;

        const mailAttachments: Array<{ filename: string; content: Buffer }> = [];
        const seenKeys = new Set<string>();

        for (const reminder of userReminders) {
          const item = items.find((i) => i.id === reminder.itemId);
          if (!item || item.source !== "event" || !item.sourceId) continue;
          if ((item.attachmentNames?.length ?? 0) === 0) continue;

          const event = await getCalendarEventById(item.sourceId);
          const files = event?.attachments?.length
            ? event.attachments
            : event?.attachment
              ? [event.attachment]
              : [];

          for (const file of files) {
            const dedupe = file.key || file.url;
            if (seenKeys.has(dedupe)) continue;
            seenKeys.add(dedupe);
            const buffer = await loadCalendarAttachmentBuffer(file);
            if (buffer && buffer.length > 0) {
              mailAttachments.push({ filename: file.name, content: buffer });
            }
          }
        }

        const html = userReminders
          .map((r) => {
            const item = items.find((i) => i.id === r.itemId);
            const names = r.attachmentNames;
            let attachmentLinks = "";
            if (names.length > 0 && item?.source === "event" && item.sourceId) {
              const links = names
                .map(
                  (name, index) =>
                    `<a href="${siteUrl}/api/admin/calendar/events/${item.sourceId}/attachment?index=${index}">${escapeHtml(name)}</a>`,
                )
                .join(", ");
              attachmentLinks = `<br/><span>Pièce(s) jointe(s) : ${links} (également jointes à cet e-mail si disponibles)</span>`;
            } else if (names.length > 0) {
              attachmentLinks = reminderAttachmentsHtml(names);
            }
            return `<li><strong>${escapeHtml(r.message)}</strong>${reminderDescriptionHtml(r.description)}${attachmentLinks}</li>`;
          })
          .join("");

        const ok = await sendEmail({
          to: user.email,
          subject: `[CRM] ${userReminders.length} rappel(s) calendrier`,
          html: `<p>Bonjour ${escapeHtml(user.name)},</p><p>Vos rappels calendrier :</p><ul>${html}</ul><p><a href="${siteUrl}/admin/crm/calendrier">Ouvrir le calendrier</a></p>`,
          attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
        });

        if (ok) {
          emailsSent += userReminders.length;
          await markRemindersFired(
            userReminders.map((r) => ({
              key: r.key,
              itemId: r.itemId,
              itemType: r.itemType,
              title: r.title,
              triggerAt: r.triggerAt,
              channels: ["email"],
            })),
          );
        }
      }
    }

    const smsUsers = await listUsersWithCalendarSmsEnabled();
    for (const user of smsUsers) {
      const due = buildRemindersForItems(items, now, GRACE_MS, {
        shortMinutes: user.preferences.defaultLeadMinutes,
        offsets: user.preferences.offsets,
      });
      const smsFired = await listFiredReminderKeysForChannel(
        due.map((r) => r.key),
        "sms",
      );

      const userReminders = due.filter((r) => {
        if (smsFired.has(r.key)) return false;
        if (!shouldSendSmsReminder(user.preferences, r.itemType)) return false;
        const item = items.find((i) => i.id === r.itemId);
        if (!item?.assignee) return true;
        return item.assignee === user.name;
      });

      for (const reminder of userReminders) {
        const pj =
          reminder.attachmentNames.length > 0
            ? ` · PJ: ${reminder.attachmentNames.join(", ")}`
            : "";
        const ok = await sendSms(user.phone, `[CRM] ${reminder.message}${pj}`.slice(0, 300));
        if (ok) {
          smsSent += 1;
          firedSmsKeys.push({
            key: reminder.key,
            itemId: reminder.itemId,
            itemType: reminder.itemType,
            title: reminder.title,
            triggerAt: reminder.triggerAt,
          });
        }
      }
    }

    if (firedSmsKeys.length > 0) {
      await markRemindersFired(
        firedSmsKeys.map((r) => ({
          ...r,
          channels: ["sms"],
        })),
      );
    }

    return NextResponse.json({
      emailsSent,
      smsSent,
    });
  } catch (error) {
    console.error("[api/cron/calendar-reminders] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
