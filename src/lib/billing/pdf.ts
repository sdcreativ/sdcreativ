import { access } from "node:fs/promises";

export type RenderedDocument = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/lib/chromium/chrome",
  "/usr/lib/chromium/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
].filter((p): p is string => Boolean(p?.trim()));

async function resolveChromiumExecutable(): Promise<string | undefined> {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return undefined;
}

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}

export function looksLikeHtmlDocument(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 64).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html");
}

/**
 * Rend un HTML en PDF binaire via Playwright/Chromium.
 * En échec : renvoie le HTML (extension html) — à éviter en production.
 */
export async function renderHtmlToDocument(html: string): Promise<RenderedDocument> {
  try {
    const { chromium } = await import("playwright-core");
    const executablePath = await resolveChromiumExecutable();
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("img", { timeout: 5_000 }).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 400));
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
      });
      const buffer = Buffer.from(pdf);
      if (!looksLikePdf(buffer)) {
        throw new Error("Chromium a renvoyé un buffer non-PDF.");
      }
      return {
        buffer,
        mimeType: "application/pdf",
        extension: "pdf",
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.warn("[billing/pdf] Rendu PDF indisponible, fallback HTML :", error);
    return {
      buffer: Buffer.from(html, "utf-8"),
      mimeType: "text/html; charset=utf-8",
      extension: "html",
    };
  }
}
