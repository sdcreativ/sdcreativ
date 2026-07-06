import { describe, expect, it } from "vitest";
import { htmlRow } from "@/lib/email";

describe("htmlRow", () => {
  it("retourne une chaîne vide si la valeur est absente", () => {
    expect(htmlRow("Nom", null)).toBe("");
    expect(htmlRow("Nom", undefined)).toBe("");
    expect(htmlRow("Nom", "")).toBe("");
  });

  it("échappe le HTML dans le label et la valeur", () => {
    const row = htmlRow('<script>', 'Jean & "Dupont"');
    expect(row).toContain("&lt;script&gt;");
    expect(row).toContain("Jean &amp; &quot;Dupont&quot;");
    expect(row).not.toContain("<script>");
  });

  it("génère un paragraphe structuré", () => {
    expect(htmlRow("Email", "contact@sdcreativ.fr")).toBe(
      "<p><strong>Email :</strong> contact@sdcreativ.fr</p>",
    );
  });
});
