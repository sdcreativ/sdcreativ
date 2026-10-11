import { test, expect } from "@playwright/test";
import {
  crmE2eCredentials,
  createE2eClient,
  createE2eQuote,
  E2E_SIGNATURE_PNG,
  isS3ConfiguredForE2e,
  loginCrm,
} from "./helpers/crm";

const { enabled } = crmE2eCredentials();

test.describe("CRM — login → devis → signature", () => {
  test.skip(!enabled, "CRM_E2E_EMAIL / PASSWORD / LOGIN_TOKEN / ADMIN_SECRET requis");

  test("parcours devis (PDF + signature portail si S3)", async ({ page }) => {
    await loginCrm(page);

    await page.goto("/admin/crm/devis");
    await expect(page).toHaveURL(/\/admin\/crm\/devis/);
    await expect(page.locator("body")).toContainText(/devis/i);

    const client = await createE2eClient(page);
    const quote = await createE2eQuote(page, {
      clientId: client.clientId,
      email: client.email,
      name: "Client E2E",
    });

    const pdfRes = await page.request.get(`/api/admin/quotes/${quote.id}/pdf`);
    expect(pdfRes.ok(), await pdfRes.text()).toBeTruthy();
    const contentType = pdfRes.headers()["content-type"] ?? "";
    expect(
      contentType.includes("pdf") ||
        contentType.includes("html") ||
        contentType.includes("octet-stream"),
    ).toBeTruthy();

    await page.goto("/admin/crm/devis");
    await expect(page.getByText(quote.reference).first()).toBeVisible({ timeout: 15_000 });

    const unsigned = await page.request.get(`/api/admin/quotes/${quote.id}/signature`);
    expect(unsigned.status()).toBe(404);

    test.skip(!isS3ConfiguredForE2e(), "S3 requis pour finaliser la signature portail");

    const portalLogin = await page.request.post("/api/espace-client/login", {
      data: {
        clientId: client.portalClientId,
        token: client.portalToken,
      },
    });
    expect(portalLogin.ok(), await portalLogin.text()).toBeTruthy();

    const challenge = await page.request.post(
      `/api/espace-client/quotes/${quote.id}/sign/challenge`,
    );
    expect(challenge.ok(), await challenge.text()).toBeTruthy();

    const otpRes = await page.request.get(
      `/api/admin/e2e/signature-otp?entityType=quote&entityId=${quote.id}`,
    );
    expect(otpRes.ok(), await otpRes.text()).toBeTruthy();
    const { code } = (await otpRes.json()) as { code: string };
    expect(code).toMatch(/^SD-[A-Z2-9]{6}$/);

    const signRes = await page.request.post(`/api/espace-client/quotes/${quote.id}/sign`, {
      data: {
        signerName: "Client E2E Signature",
        signatureData: E2E_SIGNATURE_PNG,
        otpCode: code,
        acceptTerms: true,
      },
    });
    expect(signRes.ok(), await signRes.text()).toBeTruthy();
    const signed = (await signRes.json()) as { quote: { status: string } };
    expect(signed.quote.status).toBe("signed");

    const proofRes = await page.request.get(`/api/admin/quotes/${quote.id}/signature`);
    expect(proofRes.ok()).toBeTruthy();
    const proofBody = (await proofRes.json()) as {
      proof: { signerName: string; provider: string };
    };
    expect(proofBody.proof.signerName).toContain("E2E");
    expect(proofBody.proof.provider).toBeTruthy();
  });

  test("chiffrage d'une demande du configurateur (montant à 0)", async ({ page }) => {
    await loginCrm(page);
    const stamp = Date.now();
    const res = await page.request.post("/api/admin/quotes", {
      data: {
        name: `Demande E2E ${stamp}`,
        email: `e2e-chiffrage-${stamp}@example.com`,
        projectTypeId: "e-commerce",
        projectLabel: "E-commerce",
        lines: [{ label: "E-commerce", amount: 0 }],
        subtotal: 0,
        budget: "1000",
        status: "follow_up",
        currency: "XOF",
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const { quote } = (await res.json()) as { quote: { id: string; reference: string } };

    await page.goto(`/admin/crm/devis?id=${quote.id}`);
    await expect(page.getByText("Demande à chiffrer")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Publier le devis/ })).toBeDisabled();

    await page.getByRole("button", { name: "Chiffrer le devis" }).click();
    await expect(page.getByText("Demande du client")).toBeVisible();
    const firstLine = page.getByRole("listitem").filter({ has: page.getByLabel("Prix unit. HT") }).first();
    await firstLine.getByLabel("Libellé").fill("Boutique en ligne");
    await firstLine.getByLabel("Prix unit. HT").fill("1500000");
    await page.getByRole("button", { name: /Enregistrer le chiffrage/ }).click();

    await expect(page.getByText("Demande à chiffrer")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Modifier le chiffrage" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Publier le devis/ })).toBeEnabled();

    const saved = await page.request.get(`/api/admin/quotes/${quote.id}`);
    const body = (await saved.json()) as { quote: { reference: string; subtotal: number; status: string } };
    expect(body.quote).toMatchObject({ reference: quote.reference, status: "follow_up" });
    expect(body.quote.subtotal).toBeGreaterThanOrEqual(1_500_000);
  });
});
