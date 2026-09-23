import { randomBytes } from "node:crypto";
import { SITE } from "@/lib/constants";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export type CardVisibility = {
  showPhone: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showLinkedin: boolean;
  showGithub: boolean;
  showInstagram: boolean;
  showTwitter: boolean;
  showLocation: boolean;
  showBio: boolean;
  showSkills: boolean;
  showServices: boolean;
  showPhoto: boolean;
};

/** Données brutes (compte + carte) avant filtrage public. */
export type BusinessCardSource = CardVisibility & {
  active: boolean;
  indexable: boolean;
  publicToken: string;
  name: string;
  jobTitle: string;
  department: string;
  company: string;
  email: string;
  phone: string;
  photoUrl: string;
  whatsapp: string;
  website: string;
  linkedin: string;
  github: string;
  instagram: string;
  twitter: string;
  location: string;
  languages: string;
  bio: string;
  skills: string;
  services: string;
};

export type PublicBusinessCard = {
  status: "active";
  indexable: boolean;
  name: string;
  jobTitle: string;
  department: string;
  company: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  whatsapp?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  twitter?: string;
  location?: string;
  languages?: string;
  bio?: string;
  skills: string[];
  services: string[];
};

export function generatePublicToken(): string {
  return randomBytes(18).toString("base64url");
}

export function isPublicCardToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export function businessCardPublicPath(token: string): string {
  return `/c/${token}`;
}

export function businessCardPublicUrl(token: string): string {
  const base = SITE.url.replace(/\/$/, "");
  return `${base}${businessCardPublicPath(token)}`;
}

function shown(flag: boolean, value: string): string | undefined {
  const trimmed = value.trim();
  if (!flag || !trimmed) return undefined;
  return trimmed;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
}

/**
 * Ne renvoie que les champs autorisés. Une carte inactive ne contient aucune donnée personnelle.
 */
export function toPublicBusinessCard(
  source: BusinessCardSource,
): PublicBusinessCard | { status: "inactive" } {
  if (!source.active) return { status: "inactive" };

  const skills = splitList(shown(source.showSkills, source.skills));
  const services = splitList(shown(source.showServices, source.services));

  return {
    status: "active",
    indexable: source.indexable,
    name: source.name.trim() || "SD CREATIV",
    jobTitle: source.jobTitle.trim(),
    department: source.department.trim(),
    company: source.company.trim() || "SD CREATIV",
    email: shown(source.showEmail, source.email),
    phone: shown(source.showPhone, source.phone),
    photoUrl: shown(source.showPhoto, source.photoUrl),
    whatsapp: shown(source.showWhatsapp, source.whatsapp),
    website: shown(source.showWebsite, source.website),
    linkedin: shown(source.showLinkedin, source.linkedin),
    github: shown(source.showGithub, source.github),
    instagram: shown(source.showInstagram, source.instagram),
    twitter: shown(source.showTwitter, source.twitter),
    location: shown(source.showLocation, source.location),
    languages: source.languages.trim() || undefined,
    bio: shown(source.showBio, source.bio),
    skills,
    services,
  };
}

function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function whatsappUrl(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

const PORTRAIT_TITLES = new Set(["mlle", "mme", "mr", "m"]);

function portraitTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !PORTRAIT_TITLES.has(word));
}

/** Même personne malgré les accents, la casse, un titre ou l'ordre des mots. */
export function portraitNamesMatch(left: string, right: string): boolean {
  const a = portraitTokens(left);
  const b = new Set(portraitTokens(right));
  if (a.length === 0 || b.size === 0) return false;
  const shared = a.filter((word) => b.has(word));
  const shortest = Math.min(a.length, b.size);
  return shared.length === shortest && shared.length >= 2;
}

function splitPersonName(fullName: string): { given: string; additional: string; family: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: "", additional: "", family: "" };
  if (parts.length === 1) return { given: "", additional: "", family: parts[0] ?? "" };
  const family = parts.at(-1) ?? "";
  const given = parts[0] ?? "";
  const additional = parts.slice(1, -1).join(" ");
  return { given, additional, family };
}

function foldVcardLine(line: string): string {
  const limit = 75;
  if (Buffer.byteLength(line) <= limit) return line;
  const chunks: string[] = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const max = first ? limit : limit - 1;
    let end = Math.min(rest.length, max);
    while (end > 0 && Buffer.byteLength(rest.slice(0, end)) > max) end -= 1;
    if (end === 0) end = 1;
    chunks.push(first ? rest.slice(0, end) : ` ${rest.slice(0, end)}`);
    rest = rest.slice(end);
    first = false;
  }
  return chunks.join("\r\n");
}

function telValue(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.length < 8) return phone.trim();
  return `+${digits}`;
}

/** vCard 3.0 minimal : une photo embarquée ou une URL de photo bloque l'enregistrement sur téléphone. */
export function buildVcard(card: PublicBusinessCard, cardUrl: string): string {
  const { given, additional, family } = splitPersonName(card.name);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcard(family)};${escapeVcard(given)};${escapeVcard(additional)};;`,
    `FN:${escapeVcard(card.name)}`,
    `ORG:${escapeVcard(card.company)}`,
  ];
  if (card.jobTitle) lines.push(`TITLE:${escapeVcard(card.jobTitle)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${telValue(card.phone)}`);
  if (card.email) lines.push(`EMAIL:${escapeVcard(card.email)}`);
  lines.push(`URL:${escapeVcard(card.website || cardUrl)}`);
  if (card.location) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(card.location)};;;;`);
  if (card.bio) lines.push(`NOTE:${escapeVcard(card.bio)}`);
  lines.push("END:VCARD");
  return `${lines.map(foldVcardLine).join("\r\n")}\r\n`;
}

export function deviceTypeFromUserAgent(userAgent: string): "mobile" | "tablet" | "desktop" | "unknown" {
  const value = userAgent.toLowerCase();
  if (!value.trim()) return "unknown";
  if (/ipad|tablet|kindle|silk/.test(value)) return "tablet";
  if (/mobi|iphone|android/.test(value)) return "mobile";
  return "desktop";
}

export function safeCountryCode(raw: string | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === "XX" || code === "T1") return null;
  return code;
}

export function safeReferrer(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const value = `${url.hostname}${url.pathname}`.slice(0, 200);
    return value || null;
  } catch {
    return null;
  }
}
