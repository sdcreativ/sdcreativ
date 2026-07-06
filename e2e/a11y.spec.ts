import { test } from "@playwright/test";
import {
  assertCookieBannerAccessible,
  assertNoA11yViolations,
  gotoWithAcceptedCookies,
  gotoPage,
  prepFreshCookies,
} from "./helpers/a11y";

const publicPages = [
  { name: "Accueil", path: "/" },
  { name: "Contact", path: "/contact" },
  { name: "Devis", path: "/devis" },
  { name: "FAQ", path: "/faq" },
  { name: "Services", path: "/services" },
  { name: "Mentions légales", path: "/mentions-legales" },
  { name: "Politique confidentialité", path: "/politique-confidentialite" },
  { name: "Accueil EN", path: "/en" },
] as const;

test.describe("Accessibilité — pages publiques (axe WCAG 2.x AA)", () => {
  test.describe.configure({ timeout: 60_000 });

  test("bandeau cookies conforme", async ({ page }) => {
    await prepFreshCookies(page);
    await gotoPage(page, "/");
    await assertCookieBannerAccessible(page);
  });

  for (const { name, path } of publicPages) {
    test(`${name} (${path})`, async ({ page }) => {
      await gotoWithAcceptedCookies(page, path);
      await assertNoA11yViolations(page);
    });
  }

  test("404", async ({ page }) => {
    await gotoWithAcceptedCookies(page, "/page-inexistante-a11y-test");
    await assertNoA11yViolations(page);
  });
});
