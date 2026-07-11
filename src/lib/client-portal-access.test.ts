import { describe, expect, it } from "vitest";
import {
  generatePortalAccessToken,
  hashPortalAccessToken,
} from "@/lib/client-portal-access";

describe("client-portal-access", () => {
  it("génère un token d'au moins 8 caractères", () => {
    const token = generatePortalAccessToken();
    expect(token.length).toBeGreaterThanOrEqual(8);
  });

  it("hash stable pour validation", () => {
    const token = "test-token-12345678";
    expect(hashPortalAccessToken(token)).toBe(hashPortalAccessToken(token));
    expect(hashPortalAccessToken(token)).not.toBe(hashPortalAccessToken("other-token-12345678"));
  });
});
