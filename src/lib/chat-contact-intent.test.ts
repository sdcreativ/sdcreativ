import { describe, expect, it } from "vitest";
import { detectChatIntent } from "@/lib/chat-contact-intent";
import { visitorTranscript } from "@/lib/chat-conversations";

describe("intention commerciale dans le chat", () => {
  it("repère les demandes qui méritent un rappel", () => {
    expect(detectChatIntent("Je voudrais parler à un conseiller")).toBe("humain");
    expect(detectChatIntent("Pouvez-vous me rappeler ?")).toBe("humain");
    expect(detectChatIntent("On peut prendre un rendez-vous jeudi ?")).toBe("rdv");
    expect(detectChatIntent("J'ai un projet de boutique en ligne")).toBe("devis");
    expect(detectChatIntent("Combien coûte un site vitrine ?")).toBe("prix");
    expect(detectChatIntent("How much is a website?")).toBe("prix");
  });

  it("ignore les questions générales", () => {
    expect(detectChatIntent("Bonjour")).toBeNull();
    expect(detectChatIntent("Qui es-tu, Nari ?")).toBeNull();
    expect(detectChatIntent("Vous faites du SEO ?")).toBeNull();
  });

  it("résume les questions du visiteur, sans les réponses de Nari", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "Un site e-commerce ?", createdAt: "" },
      { id: "2", role: "assistant" as const, content: "Oui, bien sûr.", createdAt: "" },
      { id: "3", role: "user" as const, content: "Avec Mobile Money", createdAt: "" },
    ];
    expect(visitorTranscript(messages)).toBe("— Un site e-commerce ?\n— Avec Mobile Money");
    expect(visitorTranscript(messages, 10)).toHaveLength(10);
  });
});

describe("correspondance des mots-clés", () => {
  it("en début de mot seulement", async () => {
    const { keywordMatches, respondFromKnowledge } = await import("@/lib/chat-responder");
    expect(keywordMatches("organisez-vous des mariages ?", "ia")).toBe(false);
    expect(keywordMatches("vous faites de l'ia ?", "ia")).toBe(true);
    expect(keywordMatches("quels sont vos tarifs ?", "tarif")).toBe(true);
    expect(keywordMatches("un site e-commerce", "commerce")).toBe(true);
    expect(respondFromKnowledge("Organisez-vous des mariages ?").source).toBe("fallback");
  });
});
