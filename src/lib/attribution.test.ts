import { describe, expect, it } from "vitest";
import {
  attributionSchema,
  classifyChannel,
  leadChannel,
  mergeAttribution,
  touchFromVisit,
  whatsappReference,
} from "@/lib/attribution";

const now = new Date("2026-10-11T10:00:00Z");
const visit = (url: string, ref = "") => touchFromVisit(url, ref, now);

describe("canal d'acquisition", () => {
  it("publicités Meta et Google", () => {
    expect(visit("https://sdcreativ.com/offre/audit-gratuit?utm_source=facebook&utm_medium=paid&utm_campaign=audit-oct").channel).toBe("meta_ads");
    expect(visit("https://sdcreativ.com/?utm_source=instagram&utm_medium=cpc").channel).toBe("meta_ads");
    expect(visit("https://sdcreativ.com/?gclid=abc123").channel).toBe("google_ads");
    expect(visit("https://sdcreativ.com/?utm_source=google&utm_medium=cpc").channel).toBe("google_ads");
  });

  it("organique : recherche, réseaux, sites, direct", () => {
    expect(visit("https://sdcreativ.com/tarifs", "https://www.google.ci/").channel).toBe("google_organic");
    expect(visit("https://sdcreativ.com/", "https://l.facebook.com/").channel).toBe("social_organic");
    expect(visit("https://sdcreativ.com/?fbclid=xyz").channel).toBe("social_organic");
    expect(visit("https://sdcreativ.com/", "https://annuaire-abidjan.ci/agences").channel).toBe("referral");
    expect(visit("https://sdcreativ.com/").channel).toBe("direct");
    // Navigation interne : pas une provenance.
    expect(visit("https://sdcreativ.com/devis", "https://sdcreativ.com/tarifs").channel).toBe("direct");
  });

  it("e-mail, partenaire, WhatsApp", () => {
    expect(classifyChannel({ medium: "email" })).toBe("email");
    expect(classifyChannel({ source: "cabinet-kone", medium: "partenaire" })).toBe("partner");
    expect(classifyChannel({ source: "whatsapp" })).toBe("whatsapp");
  });

  it("garde le type d'identifiant de clic, jamais sa valeur", () => {
    const touch = visit("https://sdcreativ.com/?gclid=SECRET-VALUE");
    expect(touch.clickId).toBe("gclid");
    expect(JSON.stringify(touch)).not.toContain("SECRET-VALUE");
  });
});

describe("parcours du visiteur", () => {
  const ad = visit("https://sdcreativ.com/?utm_source=facebook&utm_medium=paid&utm_campaign=audit-oct");
  const back = visit("https://sdcreativ.com/devis");

  it("premier contact conservé, retour direct n'efface pas la campagne", () => {
    const after = mergeAttribution(mergeAttribution(null, ad), back);
    expect(after.first?.campaign).toBe("audit-oct");
    expect(after.last?.campaign).toBe("audit-oct");
    expect(leadChannel(after)).toBe("meta_ads");
  });

  it("une nouvelle provenance devient le dernier contact", () => {
    const google = visit("https://sdcreativ.com/", "https://www.google.com/");
    const after = mergeAttribution(mergeAttribution(null, ad), google);
    expect(after.first?.channel).toBe("meta_ads");
    expect(after.last?.channel).toBe("google_organic");
  });

  it("référence WhatsApp : campagne, sinon rien en accès direct", () => {
    expect(whatsappReference(mergeAttribution(null, ad))).toBe("réf. audit-oct");
    expect(whatsappReference(mergeAttribution(null, back))).toBeNull();
  });

  it("validation : refuse un canal inconnu, tronque rien d'invalide", () => {
    expect(attributionSchema.safeParse({ last: { channel: "pirate" } }).success).toBe(false);
    expect(attributionSchema.safeParse({ last: ad }).success).toBe(true);
  });
});
