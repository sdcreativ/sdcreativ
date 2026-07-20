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
    // Fallback HTML si Chromium absent — mise en page type A4 déjà dans le HTML
    return new Response(new Uint8Array(doc.buffer), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
        "X-Pdf-Fallback": "html",
        "X-Pdf-Hint":
          "Chromium indisponible : document servi en HTML. Définissez CHROMIUM_EXECUTABLE_PATH.",
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
