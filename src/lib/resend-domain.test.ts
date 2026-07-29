import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchResendDomainStatus } from "@/lib/resend-domain";

describe("fetchResendDomainStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retourne null sans clé API", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_FROM_EMAIL", "contact@sdcreativ.com");
    expect(await fetchResendDomainStatus()).toBeNull();
  });

  it("détecte un domaine verified", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_FROM_EMAIL", "contact@sdcreativ.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ name: "sdcreativ.com", status: "verified" }],
        }),
      }),
    );
    await expect(fetchResendDomainStatus()).resolves.toEqual({
      domain: "sdcreativ.com",
      status: "verified",
      rawStatus: "verified",
    });
  });

  it("détecte un domaine failed", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("CONTACT_FROM_EMAIL", "hello@sdcreativ.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ name: "sdcreativ.com", status: "failed" }],
        }),
      }),
    );
    await expect(fetchResendDomainStatus()).resolves.toMatchObject({
      domain: "sdcreativ.com",
      status: "failed",
    });
  });
});
