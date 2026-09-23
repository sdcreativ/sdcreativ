import { randomBytes } from "node:crypto";
import { SITE } from "@/lib/constants";
import { resolveImageDisplayUrl } from "@/lib/image-url";

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

function absolutePhotoUrl(photoUrl: string): string {
  const display = resolveImageDisplayUrl(photoUrl);
  if (/^https?:\/\//i.test(display)) return display;
  const base = SITE.url.replace(/\/$/, "");
  return `${base}${display.startsWith("/") ? display : `/${display}`}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function whatsappUrl(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

function splitPersonName(fullName: string): { given: string; family: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { given: parts[0] ?? "", family: "" };
  return { given: parts.slice(0, -1).join(" "), family: parts.at(-1) ?? "" };
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

/** vCard 3.0 que l'app Contacts d'iPhone peut enregistrer. */
export function buildVcard(
  card: PublicBusinessCard,
  cardUrl: string,
  photoJpegBase64?: string,
): string {
  const { given, family } = splitPersonName(card.name);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVcard(card.name)}`,
    `N:${escapeVcard(family)};${escapeVcard(given)};;;`,
    `ORG:${escapeVcard(card.company)}`,
  ];
  if (card.jobTitle) lines.push(`TITLE:${escapeVcard(card.jobTitle)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${telValue(card.phone)}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcard(card.email)}`);
  if (card.website) lines.push(`URL:${escapeVcard(card.website)}`);
  else lines.push(`URL:${escapeVcard(cardUrl)}`);
  if (card.location) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(card.location)};;;;`);
  if (card.bio) lines.push(`NOTE:${escapeVcard(card.bio)}`);
  const photo = photoJpegBase64?.replace(/\s/g, "");
  if (photo) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo}`);
  lines.push("END:VCARD");
  return `${lines.map(foldVcardLine).join("\r\n")}\r\n`;
}

/** JPEG embarqué : une URL distante dans PHOTO empêche souvent iPhone d'enregistrer le contact. */
export async function readCardPhotoJpeg(photoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(absolutePhotoUrl(photoUrl), {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length === 0 || input.length > 4_000_000) return null;
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(input, { failOn: "none" }).rotate().jpeg({ quality: 80 }).toBuffer();
    if (jpeg.length === 0 || jpeg.length > 350_000) return null;
    return jpeg.toString("base64");
  } catch {
    return null;
  }
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
