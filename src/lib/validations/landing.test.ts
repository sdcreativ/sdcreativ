import { describe, expect, it } from "vitest";
import { landingLeadSchema } from "@/lib/validations/landing";
import { isBotUserAgent, marketingEventSchema } from "@/lib/marketing-events";

describe("landingLeadSchema", () => {
  const valid = { firstName: "Awa", whatsapp: "+225 07 08 09 10 11", email: "awa@example.com" };

  it("accepte le minimum (prénom, WhatsApp, e-mail)", () => {
    expect(landingLeadSchema.safeParse(valid).success).toBe(true);
  });

  it("refuse un numéro WhatsApp trop court", () => {
    const result = landingLeadSchema.safeParse({ ...valid, whatsapp: "0708" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Numéro WhatsApp invalide.");
  });

  it("refuse un e-mail invalide", () => {
    expect(landingLeadSchema.safeParse({ ...valid, email: "awa" }).success).toBe(false);
  });
});

describe("marketing events", () => {
  it("ignore les robots et les aperçus de liens", () => {
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("WhatsApp/2.23.20.0")).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1")).toBe(false);
  });

  it("valide le type d'événement et le canal", () => {
    expect(marketingEventSchema.safeParse({ kind: "visit", channel: "meta_ads" }).success).toBe(true);
    expect(marketingEventSchema.safeParse({ kind: "purchase", channel: "meta_ads" }).success).toBe(false);
    expect(marketingEventSchema.safeParse({ kind: "visit", channel: "tiktok" }).success).toBe(false);
  });
});
