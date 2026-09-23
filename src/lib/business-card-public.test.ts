import { describe, expect, it } from "vitest";
import {
  buildVcard,
  deviceTypeFromUserAgent,
  generatePublicToken,
  isPublicCardToken,
  safeCountryCode,
  safeReferrer,
  toPublicBusinessCard,
  whatsappUrl,
  type BusinessCardSource,
} from "@/lib/business-card-public";
import { businessCardFieldsSchema } from "@/lib/validations/business-card";
import { roleHasPermission } from "@/lib/crm-permissions";

function source(overrides: Partial<BusinessCardSource> = {}): BusinessCardSource {
  return {
    active: true,
    indexable: false,
    publicToken: "a7D9kP2xE4mQ8nR1sT3uVw",
    name: "Paterne Gnonzion",
    jobTitle: "Architecte logiciel",
    department: "Technique",
    company: "SD CREATIV",
    email: "paterne@sdcreativ.com",
    phone: "+2250700000000",
    photoUrl: "https://example.com/p.jpg",
    whatsapp: "+2250700000000",
    website: "https://sdcreativ.com",
    linkedin: "https://linkedin.com/in/paterne",
    github: "",
    instagram: "",
    twitter: "",
    location: "Abidjan",
    languages: "Français",
    bio: "Direction technique.",
    skills: "Next.js, PostgreSQL",
    services: "Sites web",
    showPhone: false,
    showWhatsapp: true,
    showEmail: true,
    showWebsite: true,
    showLinkedin: true,
    showGithub: true,
    showInstagram: false,
    showTwitter: false,
    showLocation: false,
    showBio: true,
    showSkills: true,
    showServices: true,
    showPhoto: true,
    ...overrides,
  };
}

describe("cartes de visite", () => {
  it("génère un token public non séquentiel", () => {
    const token = generatePublicToken();
    expect(isPublicCardToken(token)).toBe(true);
    expect(token).not.toMatch(/^\d+$/);
    expect(generatePublicToken()).not.toBe(token);
  });

  it("masque les champs privés côté serveur", () => {
    const card = toPublicBusinessCard(source());
    expect(card.status).toBe("active");
    if (card.status !== "active") return;
    expect(card.email).toBe("paterne@sdcreativ.com");
    expect(card.phone).toBeUndefined();
    expect(card.location).toBeUndefined();
    expect(card.github).toBeUndefined();
    expect(card.skills).toEqual(["Next.js", "PostgreSQL"]);
  });

  it("affiche le téléphone quand il est autorisé", () => {
    const card = toPublicBusinessCard(source({ showPhone: true }));
    if (card.status !== "active") throw new Error("active");
    expect(card.phone).toBe("+2250700000000");
  });

  it("ne révèle rien si la carte est inactive", () => {
    expect(toPublicBusinessCard(source({ active: false }))).toEqual({ status: "inactive" });
  });

  it("construit une vCard sans téléphone masqué", () => {
    const card = toPublicBusinessCard(source());
    if (card.status !== "active") throw new Error("active");
    const vcard = buildVcard(card, "https://sdcreativ.com/c/token");
    expect(vcard).toContain("BEGIN:VCARD");
    expect(vcard).toContain("FN:Paterne Gnonzion");
    expect(vcard).toContain("EMAIL;TYPE=INTERNET:paterne@sdcreativ.com");
    expect(vcard).not.toContain("TEL;");
    expect(whatsappUrl(card.whatsapp ?? "")).toBe("https://wa.me/2250700000000");
  });

  it("refuse une URL de réseau invalide", () => {
    const parsed = businessCardFieldsSchema.safeParse({ linkedin: "javascript:alert(1)" });
    expect(parsed.success).toBe(false);
  });

  it("réserve l'administration des cartes aux rôles autorisés", () => {
    expect(roleHasPermission("admin", "cards.write")).toBe(true);
    expect(roleHasPermission("commercial", "cards.write")).toBe(false);
    expect(roleHasPermission("commercial", "cards.read")).toBe(false);
  });

  it("classe l'appareil et ignore un pays inconnu", () => {
    expect(deviceTypeFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("mobile");
    expect(safeCountryCode("ci")).toBe("CI");
    expect(safeCountryCode("XX")).toBeNull();
    expect(safeReferrer("https://google.com/search?q=secret")).toBe("google.com/search");
  });
});
