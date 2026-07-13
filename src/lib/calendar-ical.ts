import type { CalendarItem } from "@/lib/calendar";

function formatIcalDate(date: Date, allDay: boolean): string {
  if (allDay) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildCalendarIcalFeed(items: CalendarItem[], siteName = "SD CREATIV CRM"): string {
  const now = formatIcalDate(new Date(), false);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SD CREATIV//CRM Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(siteName)}`,
  ];

  for (const item of items) {
    const start = new Date(item.startsAt);
    const end = item.endsAt ? new Date(item.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
    const uid = `${item.id}@sdcreativ-crm`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    if (item.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcalDate(end, true)}`);
    } else {
      lines.push(`DTSTART:${formatIcalDate(start, false)}`);
      lines.push(`DTEND:${formatIcalDate(end, false)}`);
    }
    lines.push(`SUMMARY:${escapeIcal(item.title)}`);
    if (item.description) lines.push(`DESCRIPTION:${escapeIcal(item.description)}`);
    lines.push(`CATEGORIES:${escapeIcal(item.type)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function buildSingleEventIcs(
  event: {
    id: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    allDay: boolean;
    meetingUrl?: string | null;
  },
  siteName = "SD CREATIV",
): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(start.getTime() + (event.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  const now = formatIcalDate(new Date(), false);
  const uid = `${event.id}@sdcreativ-crm`;
  const description = [event.description, event.meetingUrl ? `Lien : ${event.meetingUrl}` : null]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SD CREATIV//CRM Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    `X-WR-CALNAME:${escapeIcal(siteName)}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(start, true)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcalDate(end, true)}`);
  } else {
    lines.push(`DTSTART:${formatIcalDate(start, false)}`);
    lines.push(`DTEND:${formatIcalDate(end, false)}`);
  }

  lines.push(`SUMMARY:${escapeIcal(event.title)}`);
  if (description) lines.push(`DESCRIPTION:${escapeIcal(description)}`);
  if (event.meetingUrl) lines.push(`LOCATION:${escapeIcal(event.meetingUrl)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
