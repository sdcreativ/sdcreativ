#!/usr/bin/env node
/**
 * Smoke PDF : vérifie que Playwright/Chromium produit un vrai PDF.
 * Usage : npm run smoke:pdf
 * Exit 0 = OK · Exit 1 = échec
 */

import { access } from "node:fs/promises";
import { resolve } from "node:path";

const CANDIDATES = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/lib/chromium/chrome",
  "/usr/lib/chromium/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
].filter((p) => Boolean(p?.trim()));

async function resolveChromium() {
  for (const candidate of CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // next
    }
  }
  return undefined;
}

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Smoke PDF SD CREATIV</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}h1{color:#1e40af}</style>
</head><body>
<h1>SD CREATIV — smoke PDF</h1>
<p>Si ce document est un vrai PDF, Chromium est opérationnel.</p>
</body></html>`;

async function main() {
  const executablePath = await resolveChromium();
  if (!executablePath && !process.env.ALLOW_PLAYWRIGHT_BUNDLED) {
    console.error(
      "[smoke-pdf] FAIL — aucun Chromium trouvé. Définissez CHROMIUM_EXECUTABLE_PATH ou installez chromium.",
    );
    console.error("[smoke-pdf] Candidats :", CANDIDATES.join(", ") || "(vide)");
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch (error) {
    console.error("[smoke-pdf] FAIL — playwright-core indisponible :", error.message);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    const buffer = Buffer.from(pdf);
    const isPdf = buffer.subarray(0, 5).toString("utf8") === "%PDF-";

    if (!isPdf) {
      console.error("[smoke-pdf] FAIL — buffer non-PDF (longueur", buffer.length, ")");
      process.exit(1);
    }

    console.log(
      `[smoke-pdf] OK — PDF ${buffer.length} octets` +
        (executablePath ? ` · ${executablePath}` : " · Chromium Playwright"),
    );
    console.log(`[smoke-pdf] cwd=${resolve(process.cwd())}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("[smoke-pdf] FAIL —", error?.message || error);
  process.exit(1);
});
