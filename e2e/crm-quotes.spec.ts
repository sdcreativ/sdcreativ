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
});
