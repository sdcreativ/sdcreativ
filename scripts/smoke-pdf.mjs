#!/usr/bin/env node
/**
 * Smoke PDF : vérifie que Playwright/Chromium produit un vrai PDF.
 * Usage : npm run smoke:pdf
 * Exit 0 = OK · Exit 1 = échec
 *
 * Mac local : utilise Chrome / Chromium Playwright (`npx playwright install chromium`).
 * Docker prod : CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
 */

import { access, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const SYSTEM_CANDIDATES = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  // Linux / Docker
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/lib/chromium/chrome",
  "/usr/lib/chromium/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
].filter((p) => Boolean(p?.trim()));

async function pathExists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function findPlaywrightCacheChromium() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), "Library/Caches/ms-playwright"),
    join(homedir(), ".cache/ms-playwright"),
  ].filter(Boolean);

  for (const root of roots) {
    let entries;
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    const chromiumDirs = entries
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort()
      .reverse();
    for (const dir of chromiumDirs) {
      const macCandidates = [
        join(
          root,
          dir,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          root,
          dir,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          root,
          dir,
          "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        ),
      ];
      const linuxCandidates = [
        join(root, dir, "chrome-linux64/chrome"),
        join(root, dir, "chrome-linux/chrome"),
      ];
      for (const candidate of [...macCandidates, ...linuxCandidates]) {
        if (await pathExists(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

async function resolveChromiumFromPlaywrightPackage() {
  try {
    const playwright = await import("playwright");
    const path = playwright.chromium.executablePath();
    if (path && (await pathExists(path))) return path;
  } catch {
    // package playwright absent ou navigateurs non installés
  }
  return undefined;
}

async function resolveChromium() {
  for (const candidate of SYSTEM_CANDIDATES) {
    if (await pathExists(candidate)) return candidate;
  }
  const fromPkg = await resolveChromiumFromPlaywrightPackage();
  if (fromPkg) return fromPkg;
  return findPlaywrightCacheChromium();
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
  if (!executablePath) {
    console.error(
      "[smoke-pdf] FAIL — aucun Chromium trouvé.",
    );
    console.error(
      "[smoke-pdf] Mac : npx playwright install chromium   OU installez Google Chrome",
    );
    console.error(
      "[smoke-pdf] Docker : CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser",
    );
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
    executablePath,
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

    console.log(`[smoke-pdf] OK — PDF ${buffer.length} octets · ${executablePath}`);
    console.log(`[smoke-pdf] cwd=${resolve(process.cwd())}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("[smoke-pdf] FAIL —", error?.message || error);
  process.exit(1);
});
