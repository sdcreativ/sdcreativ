import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import type { Result } from "axe-core";

const CONSENT_KEY = "sdcreativ-cookie-consent";

/** Préaccepte les cookies pour scanner le contenu principal sans le bandeau. */
export async function prepAcceptedCookies(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "accepted");
  }, CONSENT_KEY);
}

/** Réinitialise le consentement cookies (première visite simulée). */
export async function prepFreshCookies(page: Page) {
  await page.addInitScript((key) => {
    localStorage.removeItem(key);
  }, CONSENT_KEY);
}

export async function gotoPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
}

/** Navigation avec cookies déjà acceptés (localStorage avant chargement). */
export async function gotoWithAcceptedCookies(page: Page, path: string) {
  await prepAcceptedCookies(page);
  await page.goto(path, { waitUntil: "load" });
  await expect(page.getByRole("dialog", { name: /cookies/i })).toBeHidden({
    timeout: 10_000,
  });
}

function formatViolations(violations: Result[]) {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 3)
        .map((n) => `  • ${n.target.join(" ")} — ${n.failureSummary ?? ""}`)
        .join("\n");
      return `[${v.id}] ${v.help}\n${nodes}`;
    })
    .join("\n\n");
}

/** Analyse WCAG 2.x AA — échoue avec un message lisible si violations. */
export async function assertNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations,
    results.violations.length > 0
      ? `Violations a11y sur ${page.url()}:\n\n${formatViolations(results.violations)}`
      : undefined,
  ).toEqual([]);
}

/** Bandeau cookies seul (dialog visible après hydratation client). */
export async function assertCookieBannerAccessible(page: Page) {
  const accept = page.getByRole("button", { name: "Accepter" });
  await expect(accept).toBeVisible({ timeout: 15_000 });

  const dialog = page.getByRole("dialog", { name: /cookies/i });
  await expect(dialog).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations,
    results.violations.length > 0
      ? `Violations a11y bandeau cookies:\n\n${formatViolations(results.violations)}`
      : undefined,
  ).toEqual([]);
}
