export type RenderedDocument = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

export async function renderHtmlToDocument(html: string): Promise<RenderedDocument> {
  try {
    const { chromium } = await import("playwright-core");
    const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
      });
      return {
        buffer: Buffer.from(pdf),
        mimeType: "application/pdf",
        extension: "pdf",
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn("[billing/pdf] Rendu PDF indisponible, archivage HTML :", error);
    return {
      buffer: Buffer.from(html, "utf-8"),
      mimeType: "text/html",
      extension: "html",
    };
  }
}
