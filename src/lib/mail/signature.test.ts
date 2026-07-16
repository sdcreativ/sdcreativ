import { describe, expect, it } from "vitest";
import { appendSignature } from "@/lib/mail/signature";

describe("appendSignature", () => {
  const signature = {
    text: "\n\n--\nSD CREATIV\ncontact@sdcreativ.com",
    html: "<br/><br/><p>SD CREATIV</p>",
  };

  it("ajoute la signature texte et html", () => {
    const result = appendSignature("Bonjour", null, signature, true);
    expect(result.text).toContain("Bonjour");
    expect(result.text).toContain("SD CREATIV");
    expect(result.html).toContain("Bonjour");
    expect(result.html).toContain("SD CREATIV");
  });

  it("peut omettre la signature", () => {
    const result = appendSignature("Bonjour", null, signature, false);
    expect(result.text).toBe("Bonjour");
    expect(result.text).not.toContain("--");
  });
});
