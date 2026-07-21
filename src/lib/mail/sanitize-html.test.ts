import { describe, expect, it } from "vitest";
import { sanitizeMailHtml } from "@/lib/mail/sanitize-html";

describe("sanitizeMailHtml", () => {
  it("conserve les liens et force target=_blank", () => {
    const out = sanitizeMailHtml(
      `<p>Cliquez <a href="https://facebook.com/confirm">Confirmer maintenant</a></p>`,
    );
    expect(out).toContain("href=\"https://facebook.com/confirm\"");
    expect(out).toContain("Confirmer maintenant");
    expect(out).toContain('target="_blank"');
    expect(out).toContain("noopener");
  });

  it("retire scripts et javascript: URLs", () => {
    const out = sanitizeMailHtml(
      `<p>x</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>`,
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("javascript:");
  });

  it("conserve un bouton CTA en table (emails marketing)", () => {
    const out = sanitizeMailHtml(`
      <table><tr><td bgcolor="#1877f2">
        <a href="https://example.com/ok" style="color:#fff;padding:12px">Confirmer</a>
      </td></tr></table>
    `);
    expect(out).toContain("<table");
    expect(out).toContain("https://example.com/ok");
    expect(out).toContain("Confirmer");
  });
});
