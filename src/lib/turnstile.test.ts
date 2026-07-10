import { afterEach, describe, expect, it, vi } from "vitest";
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile";

describe("turnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("isTurnstileConfigured exige les deux clés", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined);
    expect(isTurnstileConfigured()).toBe(false);

    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined);
    expect(isTurnstileConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    expect(isTurnstileConfigured()).toBe(true);
  });

  it("accepte sans vérification si Turnstile n'est pas configuré", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined);
    await expect(verifyTurnstileToken(undefined)).resolves.toBe(true);
    await expect(verifyTurnstileToken("")).resolves.toBe(true);
  });

  it("rejette un token absent quand Turnstile est configuré", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    await expect(verifyTurnstileToken(undefined)).resolves.toBe(false);
    await expect(verifyTurnstileToken("")).resolves.toBe(false);
  });

  it("vérifie le token auprès de Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstileToken("valid-token")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
