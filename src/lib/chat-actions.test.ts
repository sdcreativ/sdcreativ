import { describe, expect, it } from "vitest";
import {
  attachChatActionLinks,
  polishChatAnswer,
  sanitizeGhostChatCopy,
  stripInternalChatPaths,
} from "@/lib/chat-actions";

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

  it("oriente vers RDV et WhatsApp si on demande un conseiller", () => {
    const links = attachChatActionLinks(
      "Je souhaite parler à un conseiller",
      "Je vous propose un échange avec l’équipe.",
      "fr",
    );
    expect(links.map((l) => l.href)).toEqual(
      expect.arrayContaining(["/rendez-vous"]),
    );
    expect(links.some((l) => l.label === "WhatsApp")).toBe(true);
  });

  it("retire le Markdown des réponses", () => {
    const cleaned = polishChatAnswer(
      "Nous proposons :\n1. **Sites web** : vitrines\n2. **SEO local**\n3. **Agents IA**",
      false,
    );
    expect(cleaned).not.toContain("**");
    expect(cleaned).toContain("Sites web");
    expect(cleaned).toContain("SEO local");
  });

  it("supprime le chat fantôme en bas à droite", () => {
    const raw =
      "Pour parler à un conseiller, vous pouvez ouvrir le chat en bas à droite ou passer un appel audio durant nos heures d'ouverture.";
    const cleaned = sanitizeGhostChatCopy(raw, false);
    expect(cleaned.toLowerCase()).not.toContain("bas à droite");
    expect(cleaned.toLowerCase()).not.toContain("appel audio");
    expect(cleaned.toLowerCase()).toMatch(/whatsapp|rendez-vous/);
  });
});
