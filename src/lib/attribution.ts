import { z } from "zod";

/**
 * Provenance des visiteurs et des prospects (pur, partagé navigateur / serveur).
 * Relie une publicité, une publication ou un partenaire à un lead du CRM, puis à un devis signé.
 * Aucune donnée personnelle : canal, paramètres UTM, domaine d'origine et page d'arrivée.
 */
export const ACQUISITION_CHANNELS = [
  "meta_ads",
  "google_ads",
  "other_ads",
  "google_organic",
  "social_organic",
  "email",
  "partner",
  "referral",
  "whatsapp",
  "word_of_mouth",
  "event",
  "outbound",
  "direct",
  "other",
] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export const CHANNEL_LABELS: Record<AcquisitionChannel, string> = {
  meta_ads: "Publicité Facebook / Instagram",
  google_ads: "Publicité Google",
  other_ads: "Autre publicité",
  google_organic: "Recherche Google",
  social_organic: "Réseaux sociaux (hors pub)",
  email: "E-mail / newsletter",
  partner: "Partenaire",
  referral: "Lien depuis un autre site",
  whatsapp: "WhatsApp",
  word_of_mouth: "Recommandation / bouche-à-oreille",
  event: "Salon / événement",
  outbound: "Prospection directe",
  direct: "Accès direct",
  other: "Autre",
};

/** Canaux saisis à la main dans le CRM (prospect arrivé hors du site). */
export const MANUAL_CHANNELS: AcquisitionChannel[] = [
  "word_of_mouth",
  "whatsapp",
  "event",
  "partner",
  "outbound",
  "meta_ads",
  "google_ads",
  "social_organic",
  "other",
];

const text = (max: number) => z.string().trim().max(max).optional();

export const attributionTouchSchema = z.object({
  channel: z.enum(ACQUISITION_CHANNELS),
  source: text(80),
  medium: text(80),
  campaign: text(120),
  content: text(120),
  term: text(120),
  /** Type d'identifiant de clic publicitaire (jamais sa valeur). */
  clickId: z.enum(["gclid", "fbclid", "ttclid", "msclkid"]).optional(),
  referrer: text(120),
  landingPath: text(300),
  at: z.string().datetime().optional(),
});
export type AttributionTouch = z.infer<typeof attributionTouchSchema>;

/** Premier et dernier contact connus du visiteur, joints aux formulaires. */
export const attributionSchema = z.object({
  first: attributionTouchSchema.optional(),
  last: attributionTouchSchema.optional(),
});
export type Attribution = z.infer<typeof attributionSchema>;

const PAID_MEDIUMS = /^(cpc|ppc|paid|paidsocial|paid_social|paid-social|ads?|display|cpm|retargeting)$/;
const META_SOURCES = /^(facebook|fb|instagram|ig|meta|messenger)$/;
const SOCIAL_HOSTS = /(^|\.)(facebook|instagram|tiktok|linkedin|twitter|x|youtube|pinterest|snapchat)\.com$|^t\.co$|^lnkd\.in$|^l\.facebook\.com$|^lm\.facebook\.com$/;
const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|qwant\.com|ecosia\.org)$/;

function host(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

/** Canal d'un contact, à partir des UTM, de l'identifiant de clic et du site d'origine. */
export function classifyChannel(input: {
  source?: string;
  medium?: string;
  clickId?: AttributionTouch["clickId"];
  referrerHost?: string;
}): AcquisitionChannel {
  const source = input.source?.toLowerCase() ?? "";
  const medium = input.medium?.toLowerCase() ?? "";
  const ref = input.referrerHost ?? "";

  if (input.clickId === "gclid" || (source === "google" && PAID_MEDIUMS.test(medium))) return "google_ads";
  if (META_SOURCES.test(source) && PAID_MEDIUMS.test(medium)) return "meta_ads";
  if (PAID_MEDIUMS.test(medium)) return "other_ads";
  if (medium === "email" || medium === "newsletter" || source === "newsletter") return "email";
  if (medium === "partner" || medium === "partenaire" || medium === "affiliate") return "partner";
  if (source === "whatsapp" || medium === "whatsapp") return "whatsapp";
  if (META_SOURCES.test(source) || medium === "social" || input.clickId === "fbclid" || input.clickId === "ttclid") {
    return "social_organic";
  }
  if (source || medium) return "referral";
  if (ref && SEARCH_HOSTS.test(ref)) return "google_organic";
  if (ref && SOCIAL_HOSTS.test(ref)) return "social_organic";
  if (ref) return "referral";
  return "direct";
}

/**
 * Contact d'une visite à partir de l'URL d'arrivée et du référent. Un référent interne
 * (navigation dans le site) ne compte pas comme une provenance.
 */
export function touchFromVisit(url: string, referrer: string, now: Date = new Date()): AttributionTouch {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  const get = (key: string) => params.get(key)?.trim().slice(0, 120) || undefined;
  const clickId = (["gclid", "fbclid", "ttclid", "msclkid"] as const).find((key) => params.has(key));
  const refHost = host(referrer);
  const external = refHost && refHost !== parsed.hostname.replace(/^www\./, "").toLowerCase() ? refHost : undefined;
  const source = get("utm_source");
  const medium = get("utm_medium");
  return {
    channel: classifyChannel({ source, medium, clickId, referrerHost: external }),
    source,
    medium,
    campaign: get("utm_campaign"),
    content: get("utm_content"),
    term: get("utm_term"),
    clickId,
    referrer: external,
    landingPath: parsed.pathname.slice(0, 300),
    at: now.toISOString(),
  };
}

/**
 * Mise à jour du parcours : le premier contact est conservé, le dernier n'est remplacé que par
 * une visite qui a une vraie provenance (un retour en accès direct n'efface pas une campagne).
 */
export function mergeAttribution(previous: Attribution | null, touch: AttributionTouch): Attribution {
  const first = previous?.first ?? touch;
  const last = touch.channel === "direct" && previous?.last ? previous.last : touch;
  return { first, last };
}

/** Canal retenu pour un prospect : dernier contact non direct, sinon premier. */
export function leadChannel(attribution: Attribution | null | undefined): AcquisitionChannel | null {
  if (!attribution) return null;
  return attribution.last?.channel ?? attribution.first?.channel ?? null;
}

/** Référence courte ajoutée au message WhatsApp pré-rempli (identifier la campagne dans la conversation). */
export function whatsappReference(attribution: Attribution | null | undefined): string | null {
  const touch = attribution?.last;
  if (!touch || touch.channel === "direct") return null;
  const label = touch.campaign || touch.source || touch.channel;
  return `réf. ${label}`.slice(0, 60);
}

/** Provenance jointe à un formulaire (champ `attribution`) ; null si absente ou invalide. */
export function attributionFromBody(body: unknown): Attribution | null {
  const raw = (body as { attribution?: unknown } | null)?.attribution;
  if (!raw) return null;
  const parsed = attributionSchema.safeParse(raw);
  return parsed.success && (parsed.data.first || parsed.data.last) ? parsed.data : null;
}
