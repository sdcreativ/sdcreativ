import { describe, expect, it } from "vitest";
import { resolveDocumentLogoUrl } from "@/lib/billing/document-company";
import { embedDocumentLogoDataUrl } from "@/lib/billing/document-logo";

describe("document logo", () => {
  it("utilise le PNG documents par défaut (pas le SVG marketing)", () => {
    expect(resolveDocumentLogoUrl(null, "https://sdcreativ.com")).toBe(
      "https://sdcreativ.com/images/logo.png",
    );
    expect(resolveDocumentLogoUrl("/images/logo_sd.svg", "https://sdcreativ.com")).toBe(
      "https://sdcreativ.com/images/logo.png",
    );
  });

  it("embarque le logo local en data-URI", async () => {
    const dataUrl = await embedDocumentLogoDataUrl(
      "https://sdcreativ.com/images/logo_sd.svg",
      "https://sdcreativ.com",
    );
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(1000);
  });
});
