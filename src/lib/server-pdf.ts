import { renderHtmlToDocument } from "@/lib/billing/pdf";

/**
 * Rend un HTML en PDF binaire (Playwright/Chromium).
 * `?format=html` côté routes permet encore l’aperçu navigateur.
 */
export async function htmlToPdfResponse(
  html: string,
  filename: string,
  options?: { preferHtml?: boolean },
): Promise<Response> {
  if (options?.preferHtml) {
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
      },
    });
  }

  const doc = await renderHtmlToDocument(html);
  const safeName = filename.replace(/[^\w.\-]+/g, "_");

  if (doc.mimeType !== "application/pdf") {
    // Fallback HTML si Chromium absent — avec en-tête explicite
    return new Response(new Uint8Array(doc.buffer), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
        "X-Pdf-Fallback": "html",
      },
    });
  }

  return new Response(new Uint8Array(doc.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
