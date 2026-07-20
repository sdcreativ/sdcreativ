import { describe, expect, it } from "vitest";
import { looksLikeHtmlDocument } from "@/lib/billing/pdf";

describe("billing/pdf looksLikeHtmlDocument", () => {
  it("détecte doctype et html", () => {
    expect(looksLikeHtmlDocument(Buffer.from("<!DOCTYPE html><html></html>"))).toBe(true);
    expect(looksLikeHtmlDocument(Buffer.from("<html lang='fr'>"))).toBe(true);
    expect(looksLikeHtmlDocument(Buffer.from("  <HTML>"))).toBe(true);
  });

  it("ne confond pas un PDF", () => {
    expect(looksLikeHtmlDocument(Buffer.from("%PDF-1.4\n…"))).toBe(false);
    expect(looksLikeHtmlDocument(Buffer.from("not html"))).toBe(false);
  });
});
