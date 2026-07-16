/** Normalisation sujet / threading messages (Phase 1.2). */

const RE_PREFIX = /^(re|fw|fwd|tr|aw|sv|antw)\s*:\s*/i;

export function normalizeMailSubject(subject: string): string {
  let value = subject.trim().toLowerCase();
  let previous = "";
  while (value !== previous) {
    previous = value;
    value = value.replace(RE_PREFIX, "").trim();
  }
  return value.replace(/\s+/g, " ");
}

export function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  const email = (match?.[1] ?? raw).trim().toLowerCase();
  return email;
}

export function uniqueEmails(values: string[]): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const email = extractEmailAddress(value);
    if (email && email.includes("@")) set.add(email);
  }
  return [...set];
}

export function parseMessageIdList(header: string | undefined | null): string[] {
  if (!header?.trim()) return [];
  return header
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith("<") && part.endsWith(">"));
}

export function snippetFromBody(text: string, max = 180): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}
