import { afterEach, describe, expect, it } from "vitest";
import {
  getMailPhase0Readiness,
  HOSTINGER_MAIL,
  isMailSyncEnabled,
  MAIL_STACK,
  MAIL_V1_SHARED_MAILBOX,
} from "@/lib/mail/config";
import {
  decryptMailboxCredentials,
  encryptMailboxCredentials,
  generateMailCredentialsSecret,
} from "@/lib/mail/crypto";

const SECRET = "test-mail-credentials-secret-32chars-min!!";

describe("mail config (Phase 0)", () => {
  afterEach(() => {
    delete process.env.MAIL_SYNC_ENABLED;
    delete process.env.MAIL_CREDENTIALS_SECRET;
  });

  it("fige la boîte v1 et la stack technique", () => {
    expect(MAIL_V1_SHARED_MAILBOX).toBe("contact@sdcreativ.com");
    expect(MAIL_STACK.imap).toBe("imapflow");
    expect(MAIL_STACK.smtp).toBe("nodemailer");
    expect(HOSTINGER_MAIL.imapPort).toBe(993);
  });

  it("désactive la sync par défaut", () => {
    expect(isMailSyncEnabled()).toBe(false);
  });

  it("bloque le go Phase 1 sans secret", () => {
    const readiness = getMailPhase0Readiness();
    expect(readiness.go).toBe(false);
    expect(readiness.credentialsSecretOk).toBe(false);
    expect(readiness.blockers.length).toBeGreaterThan(0);
  });

  it("passe le go quand le secret est présent", () => {
    process.env.MAIL_CREDENTIALS_SECRET = SECRET;
    const readiness = getMailPhase0Readiness();
    expect(readiness.go).toBe(true);
    expect(readiness.credentialsSecretOk).toBe(true);
    expect(readiness.sharedMailbox).toBe("contact@sdcreativ.com");
  });
});

describe("mail crypto", () => {
  afterEach(() => {
    delete process.env.MAIL_CREDENTIALS_SECRET;
  });

  it("chiffre et déchiffre les credentials", () => {
    process.env.MAIL_CREDENTIALS_SECRET = SECRET;
    const encrypted = encryptMailboxCredentials({
      email: "contact@sdcreativ.com",
      password: "SecretPass123!",
    });
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain("SecretPass123!");
    expect(decryptMailboxCredentials(encrypted)).toEqual({
      email: "contact@sdcreativ.com",
      password: "SecretPass123!",
    });
  });

  it("refuse de déchiffrer avec un mauvais secret", () => {
    process.env.MAIL_CREDENTIALS_SECRET = SECRET;
    const encrypted = encryptMailboxCredentials({
      email: "contact@sdcreativ.com",
      password: "SecretPass123!",
    });
    process.env.MAIL_CREDENTIALS_SECRET = "another-secret-that-is-long-enough-32c";
    expect(() => decryptMailboxCredentials(encrypted)).toThrow();
  });

  it("génère un secret assez long", () => {
    expect(generateMailCredentialsSecret().length).toBeGreaterThanOrEqual(32);
  });
});
