import { afterEach, describe, expect, it, vi } from "vitest";
import { rejectIfBot } from "@/lib/form-guard";

describe("rejectIfBot", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("retourne un succès silencieux si le honeypot est rempli", async () => {
    const res = await rejectIfBot({ _hp: "bot" });
    expect(res?.status).toBe(200);
    const body = await res?.json();
    expect(body).toEqual({ success: true });
  });

  it("retourne null si aucun bot détecté et Turnstile désactivé", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined);
    await expect(rejectIfBot({ email: "a@b.com" })).resolves.toBeNull();
  });

  it("retourne 403 si Turnstile est configuré sans token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    const res = await rejectIfBot({ email: "a@b.com" });
    expect(res?.status).toBe(403);
  });
});
