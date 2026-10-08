import { test, expect } from "@playwright/test";
import { crmE2eCredentials, loginCrm } from "./helpers/crm";
import { computePlanPricing } from "../src/lib/pricing-display";

const { enabled } = crmE2eCredentials();

type Settings = {
  vatRate: number;
  hostingEur: number;
  hostingReferralEur: number;
};

type PlanResponse = {
  plan: { id: string; name: string; priceAmount: number | null; compareAtAmount: number | null; taxMention: string };
};

test.describe("CRM — Tarifs (charges, TVA, hébergement parrainé)", () => {
  test("écritures refusées sans session admin", async ({ request }) => {
    const settings = await request.put("/api/admin/pricing-settings", { data: { vatRate: 0 } });
    expect(settings.ok()).toBeFalsy();
    const create = await request.post("/api/admin/pricing-plans", {
      data: { name: "Intrus", tagline: "Test", features: ["x"] },
    });
    expect(create.ok()).toBeFalsy();
  });

  test.describe("avec session admin", () => {
    test.skip(!enabled, "CRM_E2E_EMAIL / PASSWORD / LOGIN_TOKEN / ADMIN_SECRET requis");

    test("calcul auto du TTC, prix barré et écran « Charges & TVA »", async ({ page }) => {
      await loginCrm(page);

      const settingsRes = await page.request.get("/api/admin/pricing-settings");
      expect(settingsRes.ok(), await settingsRes.text()).toBeTruthy();
      const settings = (await settingsRes.json()) as Settings;

      const name = `E2E Tarif ${Date.now()}`;
      const baseAmountHt = 144256;
      const charges = [{ id: "e2e-licence", label: "Licence E2E", amount: 20000 }];
      const expected = computePlanPricing({
        baseHt: baseAmountHt,
        charges,
        includeHosting: true,
        hostingEur: settings.hostingEur,
        hostingReferralEur: settings.hostingReferralEur,
        vatRate: settings.vatRate,
      });

      // Formule masquée : aucun impact sur le site public pendant le test.
      const createRes = await page.request.post("/api/admin/pricing-plans", {
        data: {
          name,
          tagline: "Formule de test e2e",
          priceMode: "fixed",
          baseAmountHt,
          charges,
          includeHosting: true,
          features: ["Prestation e2e"],
          locale: "fr",
          isVisible: false,
        },
      });
      expect(createRes.ok(), await createRes.text()).toBeTruthy();
      const { plan } = (await createRes.json()) as PlanResponse;

      try {
        expect(plan.priceAmount).toBe(expected.totalTtc);
        expect(plan.taxMention).toBe("ttc");
        expect(plan.compareAtAmount).toBe(
          expected.discountHt > 0 ? expected.totalTtcBeforeDiscount : null,
        );

        // PATCH partiel : ne doit rien réinitialiser (locale, calcul, hébergement).
        const patchRes = await page.request.patch(`/api/admin/pricing-plans/${plan.id}`, {
          data: { tagline: "Formule de test e2e (modifiée)" },
        });
        expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
        const patched = (await patchRes.json()) as PlanResponse;
        expect(patched.plan.priceAmount).toBe(expected.totalTtc);

        // Montant incohérent refusé côté serveur.
        const invalid = await page.request.patch(`/api/admin/pricing-plans/${plan.id}`, {
          data: { baseAmountHt: null, priceAmount: null },
        });
        expect(invalid.status()).toBe(400);

        await page.goto("/admin/crm/site/tarifs");
        const card = page.locator("article", { hasText: name });
        await expect(card).toBeVisible({ timeout: 15_000 });
        await card.getByRole("button", { name: /Charges & TVA/ }).click();

        // Le bandeau cookies est aussi un dialogue : on vise le formulaire par son titre.
        const dialog = page.getByRole("dialog", { name: "Modifier la formule" });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByLabel(/Inclure l’hébergement Hostinger/)).toBeChecked();
        await expect(dialog.getByText("Total TTC affiché")).toBeVisible();
        await dialog.getByRole("button", { name: "Annuler" }).click();
        await expect(dialog).toBeHidden();
      } finally {
        await page.request.delete(`/api/admin/pricing-plans/${plan.id}`);
      }
    });
  });
});
