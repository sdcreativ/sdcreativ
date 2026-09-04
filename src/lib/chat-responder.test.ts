import { describe, expect, it } from "vitest";
import { respondFromKnowledge } from "@/lib/chat-responder";
import { KADY_BIO_EN, KADY_BIO_FR, KADY_PROFILE } from "@/content/kady-profile";

describe("Kady — profil fictif", () => {
  it("répond à une question d’identité", () => {
    const fr = respondFromKnowledge("Qui es-tu, Kady ?", "fr");
    expect(fr.source).toBe("knowledge");
    expect(fr.answer).toBe(KADY_BIO_FR);
    expect(fr.answer).toContain(KADY_PROFILE.name);
    expect(fr.answer).toContain("pas une personne physique");
  });

  it("répond en anglais", () => {
    const en = respondFromKnowledge("Who are you, Kady?", "en");
    expect(en.source).toBe("knowledge");
    expect(en.answer).toBe(KADY_BIO_EN);
  });
});
