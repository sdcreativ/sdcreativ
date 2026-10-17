import { describe, expect, it } from "vitest";
import { kadyKnowledgeSchema } from "@/lib/kady-knowledge";
import { buildKadyDigestHtml } from "@/lib/kady-digest";

const base = {
  locale: "fr" as const,
  title: "Paiement Wave",
  keywords: ["Wave", "wave", "mobile money"],
  answer: "Oui, nos boutiques acceptent Wave et Orange Money. Demandez un devis gratuit pour votre projet.",
  links: [{ label: "Devis", href: "/devis" }],
  isActive: true,
};

describe("réponses de Nari", () => {
  it("valide une réponse et dédoublonne les mots-clés (minuscules)", () => {
    const parsed = kadyKnowledgeSchema.parse(base);
    expect(parsed.keywords).toEqual(["wave", "mobile money"]);
  });

  it("refuse un lien externe non https ou un lien vers un autre domaine déguisé", () => {
    expect(kadyKnowledgeSchema.safeParse({ ...base, links: [{ label: "x", href: "http://exemple.com" }] }).success).toBe(false);
    expect(kadyKnowledgeSchema.safeParse({ ...base, links: [{ label: "x", href: "//exemple.com" }] }).success).toBe(false);
    expect(kadyKnowledgeSchema.safeParse({ ...base, links: [{ label: "x", href: "javascript:alert(1)" }] }).success).toBe(false);
  });

  it("refuse une réponse vide ou sans mot-clé", () => {
    expect(kadyKnowledgeSchema.safeParse({ ...base, answer: "Oui." }).success).toBe(false);
    expect(kadyKnowledgeSchema.safeParse({ ...base, keywords: [] }).success).toBe(false);
  });

  it("le bilan hebdomadaire liste les questions et échappe le HTML", () => {
    const html = buildKadyDigestHtml(
      { conversations: 12, leads: 2, thumbsUp: 5, thumbsDown: 1 },
      [
        { messageId: "1", conversationId: "c", question: "<b>Wave ?</b>", answer: "", reason: "fallback", locale: "fr", createdAt: "" },
        { messageId: "2", conversationId: "c", question: "Hébergement ?", answer: "", reason: "thumbs_down", locale: "fr", createdAt: "" },
      ],
      "https://sdcreativ.com",
      "Nari",
    );
    expect(html).toContain("<h2>Nari — bilan des 7 derniers jours</h2>");
    expect(html).toContain("<strong>12</strong> conversation(s)");
    expect(html).toContain("&lt;b&gt;Wave ?&lt;/b&gt;");
    expect(html).toContain("réponse jugée inutile");
    expect(html).toContain("https://sdcreativ.com/admin/crm/site/kady/questions");
  });
});
