import { describe, expect, it } from "vitest";
import { prepareBlogContentHtml, slugifyHeading } from "@/lib/blog-toc";

describe("blog-toc", () => {
  it("slugifie les accents", () => {
    expect(slugifyHeading("Ce qu'un CRM change")).toBe("ce-qu-un-crm-change");
  });

  it("injecte des ids et extrait le sommaire", () => {
    const { html, headings } = prepareBlogContentHtml(
      "<h2>Premier</h2><p>x</p><h3>Sous-titre</h3><h2>Premier</h2>",
    );
    expect(headings).toEqual([
      { id: "premier", text: "Premier", level: 2 },
      { id: "sous-titre", text: "Sous-titre", level: 3 },
      { id: "premier-2", text: "Premier", level: 2 },
    ]);
    expect(html).toContain('id="premier"');
    expect(html).toContain('id="premier-2"');
    expect(html).toContain('id="sous-titre"');
  });

  it("conserve un id existant", () => {
    const { html, headings } = prepareBlogContentHtml(
      '<h2 id="custom">Titre</h2>',
    );
    expect(headings[0]?.id).toBe("custom");
    expect(html).toContain('id="custom"');
  });
});
