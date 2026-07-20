import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isCrmE2eEnabled,
  storeCrmE2eSignatureOtp,
  takeCrmE2eSignatureOtp,
  verifyCrmE2eLoginToken,
} from "@/lib/crm-e2e";

afterEach(() => {
  vi.unstubAllEnvs();
  // consomme tout OTP résiduel
  takeCrmE2eSignatureOtp("quote", "cleanup");
});

describe("crm-e2e", () => {
  it("désactivé sans token ou token trop court", () => {
    vi.stubEnv("CRM_E2E_LOGIN_TOKEN", undefined);
    expect(isCrmE2eEnabled()).toBe(false);
    expect(verifyCrmE2eLoginToken("anything")).toBe(false);

    vi.stubEnv("CRM_E2E_LOGIN_TOKEN", "trop-court");
    expect(isCrmE2eEnabled()).toBe(false);
    expect(verifyCrmE2eLoginToken("trop-court")).toBe(false);
  });

  it("valide le token en comparaison timing-safe", () => {
    const token = "a".repeat(32);
    vi.stubEnv("CRM_E2E_LOGIN_TOKEN", token);
    expect(isCrmE2eEnabled()).toBe(true);
    expect(verifyCrmE2eLoginToken(token)).toBe(true);
    expect(verifyCrmE2eLoginToken("b".repeat(32))).toBe(false);
    expect(verifyCrmE2eLoginToken(token + "x")).toBe(false);
  });

  it("stocke et consomme un OTP e2e une seule fois", () => {
    vi.stubEnv("CRM_E2E_LOGIN_TOKEN", "c".repeat(32));
    storeCrmE2eSignatureOtp("quote", "q-1", "SD-ABC123");
    expect(takeCrmE2eSignatureOtp("quote", "q-1")).toBe("SD-ABC123");
    expect(takeCrmE2eSignatureOtp("quote", "q-1")).toBeNull();
  });

  it("n’expose pas d’OTP si e2e désactivé", () => {
    vi.stubEnv("CRM_E2E_LOGIN_TOKEN", undefined);
    storeCrmE2eSignatureOtp("quote", "q-2", "SD-XYZ999");
    expect(takeCrmE2eSignatureOtp("quote", "q-2")).toBeNull();
  });
});
