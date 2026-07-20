import { expect, type Page } from "@playwright/test";

export function crmE2eCredentials() {
  const email = process.env.CRM_E2E_EMAIL?.trim();
  const password = process.env.CRM_E2E_PASSWORD;
  const e2eLoginToken = process.env.CRM_E2E_LOGIN_TOKEN?.trim();
  const enabled = Boolean(
    email && password && e2eLoginToken && e2eLoginToken.length >= 32 && process.env.ADMIN_SECRET,
  );
  return { enabled, email: email ?? "", password: password ?? "", e2eLoginToken: e2eLoginToken ?? "" };
}

export function isS3ConfiguredForE2e(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET,
  );
}

/** PNG 1×1 transparent — data URL acceptée par signPortalQuote. */
export const E2E_SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function loginCrm(page: Page): Promise<void> {
  const { email, password, e2eLoginToken } = crmE2eCredentials();
  const res = await page.request.post("/api/admin/login", {
    data: { email, password, e2eLoginToken },
  });
  expect(res.ok(), `login CRM: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = (await res.json()) as { success?: boolean; requires2fa?: boolean };
  expect(body.success, "bypass 2FA e2e attendu (CRM_E2E_LOGIN_TOKEN)").toBe(true);
  expect(body.requires2fa).toBeFalsy();
}

export async function createE2eClient(page: Page): Promise<{
  clientId: string;
  portalClientId: string;
  portalToken: string;
  email: string;
}> {
  const stamp = Date.now();
  const email = `e2e-devis-${stamp}@example.com`;
  const createRes = await page.request.post("/api/admin/clients", {
    data: {
      name: `E2E Client ${stamp}`,
      email,
      company: "E2E SD CREATIV",
      status: "active",
      portalClientId: `e2e-${stamp}`,
    },
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();
  const created = (await createRes.json()) as {
    client: { id: string; portalClientId: string | null };
  };

  const accessRes = await page.request.post(
    `/api/admin/clients/${created.client.id}/portal-access`,
    { data: { action: "generate", sendEmail: false } },
  );
  expect(accessRes.ok(), await accessRes.text()).toBeTruthy();
  const access = (await accessRes.json()) as {
    portalClientId: string;
    plainToken: string;
  };

  return {
    clientId: created.client.id,
    portalClientId: access.portalClientId,
    portalToken: access.plainToken,
    email,
  };
}

export async function createE2eQuote(
  page: Page,
  input: { clientId: string; email: string; name: string },
): Promise<{ id: string; reference: string }> {
  const res = await page.request.post("/api/admin/quotes", {
    data: {
      name: input.name,
      email: input.email,
      company: "E2E SD CREATIV",
      projectLabel: "Site vitrine e2e",
      clientId: input.clientId,
      lines: [{ label: "Conception site", amount: 150_000, quantity: 1, unitPrice: 150_000 }],
      subtotal: 150_000,
      status: "sent",
      currency: "XOF",
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { quote: { id: string; reference: string } };
  return body.quote;
}
