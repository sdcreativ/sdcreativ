import { describe, expect, it } from "vitest";
import { attachChatActionLinks, stripInternalChatPaths } from "@/lib/chat-actions";

describe("boutons d’action Kady", () => {
  it("ajoute devis, RDV et contact quand la réponse les propose", () => {
    const answer =
      "Pour demander un devis personnalisé, vous pouvez remplir notre formulaire en ligne ou prendre rendez-vous avec un conseiller. Vous trouverez ces options dans la section /devis ou /contact.";
    const links = attachChatActionLinks("Je veux un devis", answer, "fr");
    expect(links.map((l) => l.href)).toEqual([
      "/devis",
      "/rendez-vous",
      "/contact",
    ]);
  });

  it("retire les chemins bruts du texte", () => {
    const cleaned = stripInternalChatPaths(
      "Vous trouverez ces options dans la section /devis ou /contact. N’hésitez pas.",
    );
    expect(cleaned).toContain("ci-dessous");
    expect(cleaned).not.toContain("/devis");
    expect(cleaned).not.toContain("/contact");
  });

  it("n’ajoute rien si aucune action n’est évoquée", () => {
    expect(attachChatActionLinks("Merci", "Avec plaisir.", "fr")).toEqual([]);
  });
});
