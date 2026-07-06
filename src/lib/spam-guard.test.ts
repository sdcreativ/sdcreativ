import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, isHoneypotTripped } from "@/lib/spam-guard";

describe("isHoneypotTripped", () => {
  it("retourne false si le corps est absent ou invalide", () => {
    expect(isHoneypotTripped(null)).toBe(false);
    expect(isHoneypotTripped(undefined)).toBe(false);
    expect(isHoneypotTripped("text")).toBe(false);
  });

  it("retourne false si le honeypot est vide", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "" })).toBe(false);
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "   " })).toBe(false);
  });

  it("retourne true si le honeypot est rempli", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "spam@bot.com" })).toBe(true);
  });
});
