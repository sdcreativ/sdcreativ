import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildClientProfile,
  parseClientPortalConfig,
  validateClientCredentials,
} from "@/lib/client-portal-config";

describe("parseClientPortalConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retourne un objet vide sans variable d'environnement", () => {
    vi.stubEnv("CLIENT_PORTAL_TOKENS", undefined);
    expect(parseClientPortalConfig()).toEqual({});
  });

  it("parse le format simple token string", () => {
    vi.stubEnv(
      "CLIENT_PORTAL_TOKENS",
      JSON.stringify({ "acme-corp": "secret-token-12345678" }),
    );
    expect(parseClientPortalConfig()).toEqual({
      "acme-corp": { token: "secret-token-12345678", profile: {} },
    });
  });

  it("ignore les tokens trop courts et le JSON invalide", () => {
    vi.stubEnv("CLIENT_PORTAL_TOKENS", JSON.stringify({ bad: "short" }));
    expect(parseClientPortalConfig()).toEqual({});

    vi.stubEnv("CLIENT_PORTAL_TOKENS", "{ invalid");
    expect(parseClientPortalConfig()).toEqual({});
  });

  it("parse le format enrichi avec profil", () => {
    vi.stubEnv(
      "CLIENT_PORTAL_TOKENS",
      JSON.stringify({
        "acme-corp": {
          token: "secret-token-12345678",
          name: "Jean Dupont",
          company: "Acme Corp",
          progress: 40,
        },
      }),
    );
    const config = parseClientPortalConfig();
    expect(config["acme-corp"]?.profile.name).toBe("Jean Dupont");
    expect(config["acme-corp"]?.profile.progress).toBe(40);
  });
});

describe("buildClientProfile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dérive le libellé depuis le slug sans profil", () => {
    vi.stubEnv("CLIENT_PORTAL_TOKENS", "{}");
    const profile = buildClientProfile("mode-style-abidjan");
    expect(profile.company).toBe("Mode Style Abidjan");
    expect(profile.projectTitle).toBe("Projet — Mode Style Abidjan");
    expect(profile.progress).toBe(0);
  });

  it("plafonne paidAmount au totalAmount", () => {
    vi.stubEnv(
      "CLIENT_PORTAL_TOKENS",
      JSON.stringify({
        client: {
          token: "secret-token-12345678",
          totalAmount: 1000000,
          paidAmount: 2000000,
        },
      }),
    );
    expect(buildClientProfile("client").paidAmount).toBe(1000000);
  });
});

describe("validateClientCredentials", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("valide l'identifiant et le token", () => {
    vi.stubEnv(
      "CLIENT_PORTAL_TOKENS",
      JSON.stringify({ client: "secret-token-12345678" }),
    );
    expect(validateClientCredentials("client", "secret-token-12345678")).toBe(true);
    expect(validateClientCredentials("client", "wrong-token")).toBe(false);
    expect(validateClientCredentials("unknown", "secret-token-12345678")).toBe(false);
  });
});
