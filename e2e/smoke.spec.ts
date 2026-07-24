import { test, expect } from "@playwright/test";

test.describe("Site public — smoke", () => {
  test("page d'accueil charge avec titre et hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SD CREATIV/i);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("switcher de langue absent (EN désactivé)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("group", { name: /langue/i })).toHaveCount(0);
  });

  test("/en redirige vers l'accueil FR", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveURL((url) => new URL(url).pathname === "/", {
      timeout: 10_000,
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("page contact affiche le formulaire", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form").first()).toBeVisible();
    await expect(page.getByLabel(/nom complet/i)).toBeVisible();
  });

  test("page FAQ accessible", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/questions/i);
  });

  test("404 affiche message d'erreur", async ({ page }) => {
    await page.goto("/page-inexistante-test-404");
    await expect(page.getByRole("heading", { name: /introuvable/i })).toBeVisible();
  });

  test("bandeau cookies visible au premier chargement", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("dialog", { name: /cookies/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
