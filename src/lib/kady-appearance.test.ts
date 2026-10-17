import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  DEFAULT_KADY_APPEARANCE,
  kadyAppearanceSchema,
  kadyContrastWarnings,
  mergeKadyAppearance,
  withAssistantName,
} from "@/lib/kady-appearance";
import { getAiGreeting } from "@/lib/threecx/ai-coexistence";

describe("apparence de Nari", () => {
  it("les valeurs par défaut sont valides et lisibles", () => {
    expect(kadyAppearanceSchema.safeParse(DEFAULT_KADY_APPEARANCE).success).toBe(true);
    expect(kadyContrastWarnings(DEFAULT_KADY_APPEARANCE)).toEqual([]);
  });

  it("complète des réglages partiels ou anciens, et ignore les réglages invalides", () => {
    const merged = mergeKadyAppearance({ name: "Awa", colors: { accent: "#E23944" } });
    expect(merged.name).toBe("Awa");
    expect(merged.colors.accent).toBe("#E23944");
    expect(merged.colors.headerBg).toBe(DEFAULT_KADY_APPEARANCE.colors.headerBg);
    expect(mergeKadyAppearance({ fontSize: 99 })).toEqual(DEFAULT_KADY_APPEARANCE);
    expect(mergeKadyAppearance(null)).toEqual(DEFAULT_KADY_APPEARANCE);
  });

  it("refuse une photo hors du site ou non https et une couleur mal formée", () => {
    const bad = (patch: object) => kadyAppearanceSchema.safeParse({ ...DEFAULT_KADY_APPEARANCE, ...patch }).success;
    expect(bad({ avatarUrl: "http://exemple.com/a.png" })).toBe(false);
    expect(bad({ avatarUrl: "javascript:alert(1)" })).toBe(false);
    expect(bad({ avatarUrl: "https://cdn.exemple.com/a.webp" })).toBe(true);
    expect(bad({ colors: { ...DEFAULT_KADY_APPEARANCE.colors, accent: "red" } })).toBe(false);
  });

  it("signale un contraste insuffisant", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    const pale = { ...DEFAULT_KADY_APPEARANCE, colors: { ...DEFAULT_KADY_APPEARANCE.colors, accent: "#FFE08A" } };
    expect(kadyContrastWarnings(pale)[0]).toMatch(/Bouton et messages du visiteur/);
  });

  it("utilise le nom choisi dans les textes et l'accueil", () => {
    expect(withAssistantName("Je m'appelle Nari, l'assistante de Kadyville.", "Awa")).toBe("Je m'appelle Awa, l'assistante de Kadyville.");
    expect(getAiGreeting("default", "fr", { name: "Awa" }).content).toContain("Je suis Awa");
    expect(getAiGreeting("default", "fr", { name: "Awa", greeting: "Salut, moi c'est Awa !" }).content).toBe("Salut, moi c'est Awa !");
    // Hors horaires : l'accueil propre à la situation est conservé.
    expect(getAiGreeting("after_hours", "fr", { greeting: "Salut" }).content).toMatch(/conseillers/);
  });
});

describe("nom personnalisé dans les réponses", () => {
  it("la base de connaissances répond à « Qui es-tu, Awa ? » avec le nouveau nom", async () => {
    const { getChatResponse } = await import("@/lib/chat-responder");
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await getChatResponse("Qui es-tu, Awa ?", "fr", [], "default", "Awa");
    process.env.OPENAI_API_KEY = previous;
    expect(res.answer).toContain("Awa");
    expect(res.answer).not.toContain("Nari");
  });
});

describe("nom accentué", () => {
  it("« Qui es-tu, Zoé ? » trouve la présentation", async () => {
    const { getChatResponse } = await import("@/lib/chat-responder");
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await getChatResponse("Qui es-tu, Zoé ?", "fr", [], "default", "Zoé");
    process.env.OPENAI_API_KEY = previous;
    expect(res.answer).toContain("Zoé");
  });
});
