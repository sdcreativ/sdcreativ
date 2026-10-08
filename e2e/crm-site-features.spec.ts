import { test, expect } from "@playwright/test";
import { crmE2eCredentials, loginCrm } from "./helpers/crm";

const { enabled } = crmE2eCredentials();

type SitePublic = Record<string, string>;

test.describe("CRM — popups, contrat de maintenance, papier à en-tête", () => {
  test("écritures et documents refusés sans session admin", async ({ request }) => {
    expect((await request.post("/api/admin/site-popups", { data: { name: "Intrus" } })).ok()).toBeFalsy();
    expect((await request.get("/api/admin/client-benefits")).ok()).toBeFalsy();
    expect((await request.get("/api/admin/letterhead-preview")).ok()).toBeFalsy();
    expect((await request.post("/api/admin/contracts", { data: {} })).ok()).toBeFalsy();
  });

  test("désinscription : jeton falsifié refusé, page sans action automatique", async ({ page, request }) => {
    const forged = await request.post("/api/public/unsubscribe", { data: { t: "YUBleC5jaQ.faux" } });
    expect(forged.status()).toBe(400);
    // Un GET (antivirus de messagerie, aperçu de lien) ne désinscrit jamais : simple redirection.
    const get = await request.get("/api/public/unsubscribe?t=abc", { maxRedirects: 0 });
    expect(get.status()).toBe(303);
    await page.goto("/desinscription?t=invalide");
    await expect(page.getByText("Ce lien de désinscription n’est pas valide")).toBeVisible();
  });

  test.describe("avec session admin", () => {
    test.skip(!enabled, "CRM_E2E_EMAIL / PASSWORD / LOGIN_TOKEN / ADMIN_SECRET requis");

    test("popup : création, diffusion sur sa seule page, écran admin", async ({ page }) => {
      await loginCrm(page);
      const stamp = Date.now();
      const path = `/e2e-popup-${stamp}`;
      const title = `Offre e2e ${stamp}`;

      const createRes = await page.request.post("/api/admin/site-popups", {
        data: {
          name: `E2E popup ${stamp}`,
          title,
          offerLabel: "Maintenance de la 2e année à -50 %",
          ctaLabel: "Recevoir mon code",
          successTitle: "Votre code est prêt",
          consentText: "J'accepte de recevoir mon code et des offres de SD CREATIV.",
          isActive: true,
          includePaths: [path],
          excludePaths: [],
          benefitKind: "maintenance_discount",
          benefitPercent: 50,
          benefitStartMonths: 12,
          benefitDurationMonths: 12,
        },
      });
      expect(createRes.ok(), await createRes.text()).toBeTruthy();
      const { popup } = (await createRes.json()) as { popup: { id: string } };

      try {
        // Seuls les champs publics sortent : ni statistiques ni avantage structuré.
        const onPage = await page.request.get(`/api/public/popup?path=${encodeURIComponent(path)}`);
        const served = (await onPage.json()) as { popup: Record<string, unknown> | null };
        expect(served.popup?.title).toBe(title);
        expect(served.popup).not.toHaveProperty("benefitPercent");
        expect(served.popup).not.toHaveProperty("impressions");

        // Test A/B : une 2e version avec la même clé reçoit les visiteurs du seau impair.
        const abKey = `e2e-${stamp}`;
        await page.request.patch(`/api/admin/site-popups/${popup.id}`, { data: { abTestKey: abKey } });
        const variantRes = await page.request.post("/api/admin/site-popups", {
          data: {
            name: `E2E popup B ${stamp}`,
            title: `${title} (B)`,
            offerLabel: "Hébergement offert",
            ctaLabel: "Recevoir mon code",
            successTitle: "Votre code est prêt",
            consentText: "J'accepte de recevoir mon code et des offres de SD CREATIV.",
            isActive: true,
            includePaths: [path],
            excludePaths: [],
            abTestKey: abKey,
            sortOrder: 1,
          },
        });
        expect(variantRes.ok(), await variantRes.text()).toBeTruthy();
        const variant = ((await variantRes.json()) as { popup: { id: string } }).popup;
        try {
          const titles = await Promise.all(
            [0, 1, 2, 3].map(async (v) => {
              const res = await page.request.get(`/api/public/popup?path=${encodeURIComponent(path)}&v=${v}`);
              return ((await res.json()) as { popup: { title: string } | null }).popup?.title;
            }),
          );
          expect(new Set(titles)).toEqual(new Set([title, `${title} (B)`]));
          expect(titles[0]).toBe(titles[2]);
        } finally {
          await page.request.delete(`/api/admin/site-popups/${variant.id}`);
        }

        const elsewhere = await page.request.get("/api/public/popup?path=/admin/crm");
        expect(((await elsewhere.json()) as { popup: unknown }).popup).toBeNull();

        // PATCH partiel : aucune valeur par défaut réinjectée.
        const patchRes = await page.request.patch(`/api/admin/site-popups/${popup.id}`, { data: { isActive: false } });
        expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
        const patched = (await patchRes.json()) as { popup: { includePaths: string[]; benefitPercent: number } };
        expect(patched.popup.includePaths).toEqual([path]);
        expect(patched.popup.benefitPercent).toBe(50);

        await page.goto("/admin/crm/site/popups");
        await expect(page.getByText(`E2E popup ${stamp}`).first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("heading", { name: "Avantages promis" })).toBeVisible();
      } finally {
        await page.request.delete(`/api/admin/site-popups/${popup.id}`);
      }
    });

    test("contrat de maintenance : document, signature → abonnement, verrouillage", async ({ page }) => {
      await loginCrm(page);
      const stamp = Date.now();
      const clientRes = await page.request.post("/api/admin/clients", {
        data: { name: `E2E Maintenance ${stamp}`, email: `e2e-maint-${stamp}@example.com`, status: "active" },
      });
      expect(clientRes.ok(), await clientRes.text()).toBeTruthy();
      const { client } = (await clientRes.json()) as { client: { id: string } };

      const maintenance = {
        level: "professionnel",
        siteName: `Site e2e ${stamp}`,
        siteUrl: null,
        includedMonths: 12,
        billingInterval: "monthly",
        priceHt: 30000,
        vatRate: 18,
        noticeDays: 30,
      };
      const noStart = await page.request.post("/api/admin/contracts", {
        data: { clientId: client.id, title: "Sans date", maintenance },
      });
      expect(noStart.status()).toBe(400);

      const createRes = await page.request.post("/api/admin/contracts", {
        data: { clientId: client.id, title: `Contrat de maintenance e2e ${stamp}`, startDate: "2026-10-08", maintenance },
      });
      expect(createRes.ok(), await createRes.text()).toBeTruthy();
      const { contract } = (await createRes.json()) as { contract: { id: string; reference: string } };

      const doc = await page.request.get(`/api/admin/contracts/${contract.id}/pdf?format=html`);
      expect(doc.ok()).toBeTruthy();
      const html = await doc.text();
      expect(html).toContain("Article 1 — Objet");
      expect(html).toContain("8 octobre 2027");
      expect(html).toContain('id="sd-letterhead-header"');

      // Pas encore signé : pas d'abonnement.
      const early = await page.request.post(`/api/admin/contracts/${contract.id}`, {
        data: { action: "maintenance-subscription" },
      });
      expect(early.status()).toBe(409);

      // Signature enregistrée à la main → abonnement créé automatiquement.
      const signRes = await page.request.patch(`/api/admin/contracts/${contract.id}`, { data: { status: "signed" } });
      expect(signRes.ok(), await signRes.text()).toBeTruthy();
      const signed = (await signRes.json()) as { contract: { metadata: { maintenance: { subscriptionId: string | null } } } };
      expect(signed.contract.metadata.maintenance.subscriptionId).toBeTruthy();

      const subsRes = await page.request.get(`/api/admin/subscriptions?clientId=${client.id}`);
      expect(subsRes.ok(), await subsRes.text()).toBeTruthy();
      const { subscriptions } = (await subsRes.json()) as {
        subscriptions: Array<{ interval: string; amount: number; nextBillingDate: string; contractId: string }>;
      };
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toMatchObject({
        interval: "monthly",
        amount: 30000,
        nextBillingDate: "2027-10-08",
        contractId: contract.id,
      });

      // Idempotent, et conditions verrouillées après signature.
      const again = await page.request.post(`/api/admin/contracts/${contract.id}`, {
        data: { action: "maintenance-subscription" },
      });
      expect(((await again.json()) as { status: string }).status).toBe("existing");
      const locked = await page.request.patch(`/api/admin/contracts/${contract.id}`, {
        data: { maintenance: { ...maintenance, priceHt: 1 } },
      });
      expect(locked.status()).toBe(409);

      await page.goto("/admin/crm/factures?tab=contrats");
      await expect(page.getByText(contract.reference).first()).toBeVisible({ timeout: 15_000 });
    });

    test("papier à en-tête : NCC et forme juridique modifiables, aperçu à jour", async ({ page }) => {
      await loginCrm(page);
      const settingsRes = await page.request.get("/api/admin/settings");
      expect(settingsRes.ok(), await settingsRes.text()).toBeTruthy();
      const stored = ((await settingsRes.json()) as { settings: { sitePublic: SitePublic } }).settings.sitePublic;
      // Base vierge (CI) : numéro WhatsApp factice filtré → vide, refusé par la validation.
      const original: SitePublic = {
        ...stored,
        whatsapp: (stored.whatsapp ?? "").length >= 8 ? stored.whatsapp : "2250102030405",
      };
      expect(original.legalName).toBeTruthy();

      const ncc = `E2E-NCC-${Date.now()}`;
      try {
        const putRes = await page.request.patch("/api/admin/settings", {
          data: { sitePublic: { ...original, ncc, legalForm: "SARL au capital de 2 000 000 F CFA" } },
        });
        expect(putRes.ok(), await putRes.text()).toBeTruthy();

        const preview = await page.request.get("/api/admin/letterhead-preview");
        expect(preview.ok()).toBeTruthy();
        if ((preview.headers()["content-type"] ?? "").includes("html")) {
          const html = await preview.text();
          expect(html).toContain(ncc);
          expect(html).toContain("SARL au capital de 2 000 000 F CFA");
        }

        await page.goto("/admin/crm/parametres?tab=site");
        await expect(page.getByText("Identité légale & papier à en-tête").first()).toBeVisible({ timeout: 15_000 });
      } finally {
        await page.request.patch("/api/admin/settings", { data: { sitePublic: original } });
      }
    });
  });
});
