import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getThreeCxCrmToken,
  isThreeCxIpAllowed,
  verifyThreeCxBearer,
} from "@/lib/threecx/auth";

function req(auth?: string, ip = "1.2.3.4") {
  return new Request("https://sdcreativ.com/api/integrations/3cx/contacts/lookup", {
    headers: {
      ...(auth ? { authorization: auth } : {}),
      "x-forwarded-for": ip,
    },
  });
}

describe("threecx auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuse sans token configuré", () => {
    vi.stubEnv("THREE_CX_CRM_TOKEN", "");
    expect(getThreeCxCrmToken()).toBeNull();
    expect(verifyThreeCxBearer(req("Bearer x"))).toBe(false);
  });

  it("accepte Bearer exact", () => {
    vi.stubEnv("THREE_CX_CRM_TOKEN", "secret-token");
    expect(verifyThreeCxBearer(req("Bearer secret-token"))).toBe(true);
    expect(verifyThreeCxBearer(req("Bearer wrong"))).toBe(false);
  });

  it("allowlist IP optionnelle", () => {
    vi.stubEnv("THREE_CX_IP_ALLOWLIST", "");
    expect(isThreeCxIpAllowed(req(undefined, "9.9.9.9"))).toBe(true);

    vi.stubEnv("THREE_CX_IP_ALLOWLIST", "1.2.3.4,5.6.7.8");
    expect(isThreeCxIpAllowed(req(undefined, "1.2.3.4"))).toBe(true);
    expect(isThreeCxIpAllowed(req(undefined, "9.9.9.9"))).toBe(false);
  });
});
