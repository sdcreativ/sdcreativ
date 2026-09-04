import { describe, expect, it, vi } from "vitest";
import { getChatResponse, respondFromKnowledge } from "@/lib/chat-responder";
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

  it("sans clé OpenAI, s’appuie sur la base locale", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const res = await getChatResponse("Qui es-tu, Kady ?", "fr");
      expect(res.source).toBe("knowledge");
      expect(res.answer).toBe(KADY_BIO_FR);
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });

  it("envoie l’historique du fil à OpenAI", async () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Un site vitrine prend 15 à 30 jours." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const res = await getChatResponse("Et les délais ?", "fr", [
        { role: "assistant", content: "Bonjour ! Je suis Kady, l'assistance virtuelle de SD CREATIV." },
        { role: "user", content: "Je veux un site vitrine." },
      ]);
      expect(res.source).toBe("llm");
      const body = JSON.parse(fetchMock.mock.calls[0][1].body) as {
        messages: { role: string; content: string }[];
      };
      expect(body.messages.some((m) => m.role === "assistant" && m.content.includes("Je suis Kady"))).toBe(true);
      expect(body.messages.at(-1)).toEqual({ role: "user", content: "Et les délais ?" });
    } finally {
      vi.unstubAllGlobals();
      if (prev === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prev;
    }
  });
});
